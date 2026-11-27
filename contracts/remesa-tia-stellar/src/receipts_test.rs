//! Tests for `register_receipt` and the receipt registry.

use crate::{
    receipts::receipt_message, Error, ReceiptRecord, RemesaTiaContract, RemesaTiaContractClient,
};
use ed25519_dalek::{Signer, SigningKey};
use soroban_sdk::{
    testutils::{Address as _, Events as _, Ledger as _},
    Address, BytesN, Env, IntoVal, String, Symbol, TryFromVal, Val, Vec,
};

#[cfg(test)]
pub fn register_test_receipt(f: &crate::test::Fixture) -> BytesN<32> {
    use crate::receipts::receipt_message;
    use ed25519_dalek::{Signer, SigningKey};

    let tia_key = SigningKey::from_bytes(&[7u8; 32]);
    let tia_pubkey = BytesN::from_array(&f.env, &tia_key.verifying_key().to_bytes());

    let client = RemesaTiaContractClient::new(&f.env, &f.contract);
    client.set_receipt_signer(&tia_pubkey);

    let receipt_hash = BytesN::from_array(&f.env, &[42u8; 32]);
    let msg = receipt_message(&f.env, &receipt_hash);
    let mut raw = [0u8; 80];
    msg.copy_into_slice(&mut raw);
    let sig = BytesN::from_array(&f.env, &tia_key.sign(&raw).to_bytes());
    let cid = String::from_str(&f.env, "bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy");

    client.register_receipt(&f.admin, &receipt_hash, &cid, &sig);
    receipt_hash
}

/// Real CIDv1 shape (59 chars, base32).
const CID: &str = "bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy";

struct Fx {
    env: Env,
    contract: Address,
    admin: Address,
    submitter: Address,
    tia_key: SigningKey,
}

impl Fx {
    fn client(&self) -> RemesaTiaContractClient<'_> {
        RemesaTiaContractClient::new(&self.env, &self.contract)
    }

    fn tia_pubkey(&self) -> BytesN<32> {
        BytesN::from_array(&self.env, &self.tia_key.verifying_key().to_bytes())
    }

    /// Signs like the TIA backend: ed25519 over utf8 `nirium-audit-v1:<hex>`.
    fn sign(&self, key: &SigningKey, hash: &BytesN<32>) -> BytesN<64> {
        let msg = receipt_message(&self.env, hash);
        let mut raw = [0u8; 80];
        msg.copy_into_slice(&mut raw);
        BytesN::from_array(&self.env, &key.sign(&raw).to_bytes())
    }

    fn cid(&self) -> String {
        String::from_str(&self.env, CID)
    }
}

fn hash(env: &Env, seed: u8) -> BytesN<32> {
    BytesN::from_array(env, &[seed; 32])
}

fn setup() -> Fx {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let treasury = Address::generate(&env);
    let submitter = Address::generate(&env);
    let contract = env.register(RemesaTiaContract, (admin.clone(), token, treasury));
    let fx = Fx {
        env,
        contract,
        admin,
        submitter,
        tia_key: SigningKey::from_bytes(&[7u8; 32]),
    };
    fx.client().set_receipt_signer(&fx.tia_pubkey());
    fx
}

#[test]
fn message_matches_backend_format() {
    let env = Env::default();
    let mut h = [0u8; 32];
    h[0] = 0xab;
    h[31] = 0x0f;
    let msg = receipt_message(&env, &BytesN::from_array(&env, &h));
    let mut raw = [0u8; 80];
    msg.copy_into_slice(&mut raw);
    let expected =
        b"nirium-audit-v1:ab0000000000000000000000000000000000000000000000000000000000000f";
    assert_eq!(&raw, expected);
}

#[test]
fn register_receipt_stores_record_and_returns_id() {
    let fx = setup();
    let client = fx.client();
    fx.env.ledger().set_timestamp(1_764_100_000);
    let h = hash(&fx.env, 1);
    let sig = fx.sign(&fx.tia_key, &h);

    let id = client.register_receipt(&fx.submitter, &h, &fx.cid(), &sig);

    assert_eq!(id, 1);
    assert_eq!(client.receipt_count(), 1);
    let rec: ReceiptRecord = client.get_receipt(&h).unwrap();
    assert_eq!(rec.id, 1);
    assert_eq!(rec.cid, fx.cid());
    assert_eq!(rec.signer, fx.tia_pubkey());
    assert_eq!(rec.submitter, fx.submitter);
    assert_eq!(rec.registered_at, 1_764_100_000);
}

#[test]
fn register_receipt_requires_submitter_auth() {
    let fx = setup();
    let h = hash(&fx.env, 2);
    let sig = fx.sign(&fx.tia_key, &h);
    fx.client()
        .register_receipt(&fx.submitter, &h, &fx.cid(), &sig);
    let auths = fx.env.auths();
    assert_eq!(auths.len(), 1);
    assert_eq!(auths[0].0, fx.submitter);
}

#[test]
fn register_receipt_fails_without_any_auth() {
    let fx = setup();
    let h = hash(&fx.env, 3);
    let sig = fx.sign(&fx.tia_key, &h);
    fx.env.set_auths(&[]);
    assert!(fx
        .client()
        .try_register_receipt(&fx.submitter, &h, &fx.cid(), &sig)
        .is_err());
    assert_eq!(fx.client().receipt_count(), 0);
}

#[test]
fn register_receipt_emits_event() {
    let fx = setup();
    let h = hash(&fx.env, 4);
    let sig = fx.sign(&fx.tia_key, &h);
    fx.client()
        .register_receipt(&fx.submitter, &h, &fx.cid(), &sig);

    let events = fx.env.events().all();
    let (from, topics, data) = events.last().unwrap();
    assert_eq!(from, fx.contract);
    let expected_topics: Vec<Val> = (Symbol::new(&fx.env, "receipt"), h.clone()).into_val(&fx.env);
    assert_eq!(topics, expected_topics);
    let (id, cid, who) = <(u64, String, Address)>::try_from_val(&fx.env, &data).unwrap();
    assert_eq!(id, 1);
    assert_eq!(cid, fx.cid());
    assert_eq!(who, fx.submitter);
}

#[test]
fn duplicate_receipt_is_rejected() {
    let fx = setup();
    let client = fx.client();
    let h = hash(&fx.env, 5);
    let sig = fx.sign(&fx.tia_key, &h);
    client.register_receipt(&fx.submitter, &h, &fx.cid(), &sig);
    let other = Address::generate(&fx.env);
    assert_eq!(
        client.try_register_receipt(&other, &h, &fx.cid(), &sig),
        Err(Ok(Error::ReceiptExists))
    );
    assert_eq!(client.receipt_count(), 1);
    assert_eq!(client.get_receipt(&h).unwrap().submitter, fx.submitter);
}

#[test]
fn signature_from_another_key_is_rejected() {
    let fx = setup();
    let h = hash(&fx.env, 6);
    let forger = SigningKey::from_bytes(&[9u8; 32]);
    let sig = fx.sign(&forger, &h);
    assert!(fx
        .client()
        .try_register_receipt(&fx.submitter, &h, &fx.cid(), &sig)
        .is_err());
    assert_eq!(fx.client().receipt_count(), 0);
    assert!(fx.client().get_receipt(&h).is_none());
}

#[test]
fn signature_for_another_hash_is_rejected() {
    let fx = setup();
    let signed = hash(&fx.env, 7);
    let altered = hash(&fx.env, 8);
    let sig = fx.sign(&fx.tia_key, &signed);
    assert!(fx
        .client()
        .try_register_receipt(&fx.submitter, &altered, &fx.cid(), &sig)
        .is_err());
    assert_eq!(fx.client().receipt_count(), 0);
}

#[test]
fn register_receipt_needs_a_configured_signer() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract = env.register(
        RemesaTiaContract,
        (admin, Address::generate(&env), Address::generate(&env)),
    );
    let client = RemesaTiaContractClient::new(&env, &contract);
    let h = BytesN::from_array(&env, &[1u8; 32]);
    let sig = BytesN::from_array(&env, &[0u8; 64]);
    assert_eq!(
        client.try_register_receipt(
            &Address::generate(&env),
            &h,
            &String::from_str(&env, CID),
            &sig
        ),
        Err(Ok(Error::NoReceiptSigner))
    );
}

#[test]
fn bad_cid_is_rejected() {
    let fx = setup();
    let client = fx.client();
    let h = hash(&fx.env, 9);
    let sig = fx.sign(&fx.tia_key, &h);
    for bad in [
        "",
        "bafkshort",
        "bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52z/",
        "Qm 1111111111111111111111111111111111111111111",
    ] {
        assert_eq!(
            client.try_register_receipt(&fx.submitter, &h, &String::from_str(&fx.env, bad), &sig),
            Err(Ok(Error::BadCid)),
            "cid {bad:?} should be rejected"
        );
    }
    assert_eq!(client.receipt_count(), 0);
}

#[test]
fn ids_increase_per_receipt() {
    let fx = setup();
    let client = fx.client();
    for seed in 10u8..13 {
        let h = hash(&fx.env, seed);
        let sig = fx.sign(&fx.tia_key, &h);
        let id = client.register_receipt(&fx.submitter, &h, &fx.cid(), &sig);
        assert_eq!(id, u64::from(seed - 9));
    }
    assert_eq!(client.receipt_count(), 3);
}

#[test]
fn set_receipt_signer_is_admin_only() {
    let fx = setup();
    let auths = fx.env.auths();
    // setup() made the call; the only authorizer is the admin.
    assert_eq!(auths.len(), 1);
    assert_eq!(auths[0].0, fx.admin);
}

#[test]
fn rotation_keeps_old_records_and_requires_new_key() {
    let fx = setup();
    let client = fx.client();
    let h1 = hash(&fx.env, 20);
    client.register_receipt(&fx.submitter, &h1, &fx.cid(), &fx.sign(&fx.tia_key, &h1));

    let new_key = SigningKey::from_bytes(&[11u8; 32]);
    let new_pub = BytesN::from_array(&fx.env, &new_key.verifying_key().to_bytes());
    client.set_receipt_signer(&new_pub);
    assert_eq!(client.receipt_signer(), Some(new_pub.clone()));

    let h2 = hash(&fx.env, 21);
    assert!(client
        .try_register_receipt(&fx.submitter, &h2, &fx.cid(), &fx.sign(&fx.tia_key, &h2))
        .is_err());
    client.register_receipt(&fx.submitter, &h2, &fx.cid(), &fx.sign(&new_key, &h2));

    assert_eq!(client.get_receipt(&h1).unwrap().signer, fx.tia_pubkey());
    assert_eq!(client.get_receipt(&h2).unwrap().signer, new_pub);
}
