/**
 * Copy del agente TIA — alineado con web/lib/elevenlabs.ts
 */

export function buildTiaConfirmationText(
  amountUSDC: number,
  reservationPda?: string,
  storeName?: string
): string {
  const amount = amountUSDC.toFixed(2);
  const amountMXN = (amountUSDC * 17.2).toFixed(0);

  let body =
    `¡Hola! Soy TIA, tu asistente de remesas.\n\n` +
    `Tu remesa de *${amount} USDC* (~$${amountMXN} MXN) ya está verificada y lista para retirar.`;

  if (storeName) {
    body += `\n\nDirígete a *${storeName}* y muestra tu código al cajero.`;
  } else {
    body += `\n\nAcude a cualquier comercio aliado con tu código de retiro.`;
  }

  if (reservationPda) {
    body += `\n\nRef: \`${reservationPda.slice(0, 8)}…${reservationPda.slice(-6)}\``;
  }

  body += `\n\n¡Tu dinero te espera! 💚`;
  return body;
}
