"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/app.ts
var app_exports = {};
__export(app_exports, {
  createApp: () => createApp
});
module.exports = __toCommonJS(app_exports);
var import_express4 = __toESM(require("express"), 1);
var niriumNs = __toESM(require("nirium"), 1);

// src/routes/tia.ts
var import_express = require("express");

// src/middleware/overrideAuth.ts
function requireOverrideSecret(req, res, next) {
  const secret = process.env.TIA_MANUAL_OVERRIDE_SECRET ?? process.env.BOT_INTERNAL_SECRET ?? "";
  if (!secret) {
    res.status(503).json({
      ok: false,
      agent: "TIA",
      error: "Manual override disabled \u2014 set TIA_MANUAL_OVERRIDE_SECRET"
    });
    return;
  }
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== secret) {
    res.status(401).json({ ok: false, agent: "TIA", error: "Unauthorized" });
    return;
  }
  next();
}
function requireCronSecret(req, res, next) {
  const secrets = [
    process.env.CRON_SECRET,
    process.env.TIA_MANUAL_OVERRIDE_SECRET
  ].filter((s) => Boolean(s));
  if (secrets.length === 0) {
    res.status(503).json({
      ok: false,
      agent: "TIA",
      error: "Alert check disabled \u2014 set CRON_SECRET (o TIA_MANUAL_OVERRIDE_SECRET)"
    });
    return;
  }
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !secrets.includes(token)) {
    res.status(401).json({ ok: false, agent: "TIA", error: "Unauthorized" });
    return;
  }
  next();
}

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version2) {
  if ((version2 === "v4" || !version2) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version2 === "v6" || !version2) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version2) {
  if ((version2 === "v4" || !version2) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version2 === "v6" || !version2) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// src/services/tiaNotify.ts
var import_prova_agent_sdk2 = require("prova-agent-sdk");

// src/services/whatsapp.ts
function resolveBotUrl() {
  const raw = (process.env.BOT_INTERNAL_URL ?? "").trim().replace(/\/$/, "");
  if (!raw) {
    throw new Error(
      "BOT_INTERNAL_URL is not set. Use a public HTTPS URL for the Baileys bot (not localhost)."
    );
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`BOT_INTERNAL_URL is not a valid URL: ${raw}`);
  }
  const host = parsed.hostname.toLowerCase();
  const loopback = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  if (loopback && process.env.VERCEL) {
    throw new Error(
      "BOT_INTERNAL_URL cannot be localhost on Vercel; the Function cannot reach your WSL. Point it at the public Baileys URL."
    );
  }
  return raw;
}
var BOT_SECRET = process.env.BOT_INTERNAL_SECRET ?? "";
function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (BOT_SECRET) h.Authorization = `Bearer ${BOT_SECRET}`;
  return h;
}
async function sendWhatsAppText(to, text) {
  const res = await fetch(`${resolveBotUrl()}/internal/send`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ to, text }),
    signal: AbortSignal.timeout(15e3)
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp text failed ${res.status}: ${body}`);
  }
}

// src/services/tiaMessages.ts
function cashoutBlinkUrl(reservationPda) {
  const site = process.env.BLINK_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_BLINK_BASE_URL;
  if (!site || !reservationPda) return void 0;
  const base = site.replace(/\/$/, "");
  const action = `${base}/api/actions/cashout?pda=${encodeURIComponent(reservationPda)}`;
  return `https://dial.to/?action=solana-action:${action}`;
}
function buildTiaConfirmationText(amountUSDC, reservationPda, storeName) {
  const amount = amountUSDC.toFixed(2);
  const amountMXN = (amountUSDC * 17.2).toFixed(0);
  let body = `\xA1Hola! Soy TIA, tu asistente de remesas.

Tu remesa de *${amount} USDC* (~$${amountMXN} MXN) ya est\xE1 verificada y lista para retirar.`;
  if (storeName) {
    body += `

Dir\xEDgete a *${storeName}* y muestra tu c\xF3digo al cajero.`;
  } else {
    body += `

Acude a cualquier comercio aliado con tu c\xF3digo de retiro.`;
  }
  if (reservationPda) {
    body += `

Ref: \`${reservationPda.slice(0, 8)}\u2026${reservationPda.slice(-6)}\``;
    const blink = cashoutBlinkUrl(reservationPda);
    if (blink) {
      body += `

Retiro (comercio): ${blink}`;
    }
  }
  body += `

\xA1Tu dinero te espera! \u{1F49A}`;
  return body;
}

// src/services/prova.ts
var import_prova_agent_sdk = require("prova-agent-sdk");
var import_web3 = require("@solana/web3.js");
var cachedClient = null;
var cachedOperatorKeypair = null;
function parseKeypair(raw) {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw.trim());
    return import_web3.Keypair.fromSecretKey(Uint8Array.from(parsed));
  } catch {
    return null;
  }
}
function loadProvaConfig() {
  if (process.env.PROVA_ENABLED !== "true") return null;
  const rpcUrl = process.env.PROVA_RPC_URL ?? process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const agentKeypair = parseKeypair(process.env.PROVA_AGENT_SECRET_KEY);
  const operatorKeypair = parseKeypair(process.env.PROVA_OPERATOR_SECRET_KEY) ?? parseKeypair(process.env.KEEPER_PRIVATE_KEY);
  if (!agentKeypair || !operatorKeypair) {
    console.warn(
      "[Prova] PROVA_ENABLED but missing PROVA_AGENT_SECRET_KEY or operator keypair"
    );
    return null;
  }
  return { rpcUrl, agentKeypair, operatorKeypair };
}
function getClient() {
  const config = loadProvaConfig();
  if (!config) return null;
  if (!cachedClient) {
    cachedClient = new import_prova_agent_sdk.ProvaClient({
      rpcUrl: config.rpcUrl,
      agentKeypair: config.agentKeypair
    });
    cachedOperatorKeypair = config.operatorKeypair;
  }
  return cachedClient;
}
async function getProvaStatus() {
  const enabled = process.env.PROVA_ENABLED === "true";
  const envAgentPda = process.env.NEXT_PUBLIC_PROVA_AGENT_PDA ?? null;
  if (!enabled) {
    return { enabled: false, active: false, agentPda: envAgentPda };
  }
  const client2 = getClient();
  if (!client2 || !cachedOperatorKeypair) {
    return { enabled: true, active: false, agentPda: envAgentPda };
  }
  try {
    const active = await client2.isAgentActive(cachedOperatorKeypair.publicKey);
    if (!active) {
      return { enabled: true, active: false, agentPda: envAgentPda };
    }
    const account = await client2.getAgentAccount(cachedOperatorKeypair.publicKey);
    return {
      enabled: true,
      active: true,
      agentPda: account.address.toBase58(),
      attestationCount: account.attestationCount
    };
  } catch (err) {
    console.warn("[Prova] getProvaStatus failed:", err);
    return { enabled: true, active: false, agentPda: envAgentPda };
  }
}
async function attestBuiltAction(actionType, builtPayload, privacyMode = false) {
  const client2 = getClient();
  if (!client2 || !cachedOperatorKeypair) {
    return { ok: false, error: "Prova not configured" };
  }
  try {
    const actionHash = await import_prova_agent_sdk.ProvaClient.hashAction(JSON.stringify(builtPayload));
    const { txSignature, explorerUrl } = await client2.attest({
      operatorKeypair: cachedOperatorKeypair,
      actionHash,
      actionType,
      privacyMode
    });
    return { ok: true, explorerUrl, txSignature };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Prova attest failed";
    console.warn("[Prova] attestBuiltAction failed:", error);
    return { ok: false, error };
  }
}

// src/services/tiaNotify.ts
var TiaNotifySchema = external_exports.object({
  walletSolana: external_exports.string().min(32),
  userWA: external_exports.string().min(10),
  amountUSDC: external_exports.number().positive(),
  reservationPda: external_exports.string().optional(),
  txSignature: external_exports.string().nullable().optional(),
  isVerified: external_exports.boolean().optional(),
  audioBase64: external_exports.string().optional(),
  storeName: external_exports.string().optional()
});
async function handleTiaNotify(input) {
  const text = buildTiaConfirmationText(
    input.amountUSDC,
    input.reservationPda,
    input.storeName
  );
  console.log(
    `[TIA] notify \u2192 ${input.userWA} | ${input.amountUSDC} USDC | verified=${input.isVerified ?? "?"}`
  );
  if (input.audioBase64) {
    console.log(
      `[TIA] audioBase64 recibido (${Math.round(input.audioBase64.length / 1024)} KB) \u2014 PTT en Sem 2`
    );
  }
  try {
    await sendWhatsAppText(input.userWA, text);
    console.log(`[TIA] WhatsApp text OK \u2192 ${input.userWA}`);
    const toolPayload = import_prova_agent_sdk2.AttestationBuilder.toolCall("whatsapp.notify", {
      reservationPda: input.reservationPda,
      amountUSDC: input.amountUSDC,
      isVerified: input.isVerified,
      txSignature: input.txSignature
    });
    const prova = await attestBuiltAction("ToolCall", toolPayload, true);
    return {
      ok: true,
      messageSent: true,
      agent: "TIA",
      whatsapp: {
        to: input.userWA,
        textSent: true,
        audioNote: input.audioBase64 ? "audio recibido; nota de voz requiere /internal/send-audio-base64 en bot" : void 0
      },
      prova: prova.ok ? { ok: true, explorerUrl: prova.explorerUrl } : { ok: false, error: prova.error }
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "WhatsApp error";
    console.error("[TIA] notify error:", message);
    if (process.env.TIA_ALLOW_NOTIFY_WITHOUT_BOT === "true") {
      return {
        ok: true,
        messageSent: false,
        agent: "TIA",
        error: message
      };
    }
    return { ok: false, messageSent: false, agent: "TIA", error: message };
  }
}

// src/routes/tia.ts
var router = (0, import_express.Router)();
router.post("/notify", async (req, res) => {
  const parsed = TiaNotifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      agent: "TIA",
      error: "Payload inv\xE1lido",
      details: parsed.error.flatten()
    });
  }
  const result = await handleTiaNotify(parsed.data);
  const status = result.ok ? 200 : 502;
  return res.status(status).json(result);
});
router.post(
  "/manual-notify",
  requireOverrideSecret,
  async (req, res) => {
    const parsed = TiaNotifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        agent: "TIA",
        error: "Payload inv\xE1lido",
        details: parsed.error.flatten()
      });
    }
    console.log("[TIA] manual-notify override \u2192", parsed.data.userWA);
    const result = await handleTiaNotify({
      ...parsed.data,
      isVerified: parsed.data.isVerified ?? true
    });
    const status = result.ok ? 200 : 502;
    return res.status(status).json({ ...result, manualOverride: true });
  }
);
router.get("/health", async (_req, res) => {
  const prova = await getProvaStatus();
  res.json({
    ok: true,
    agent: "TIA",
    service: "remesa-tia-backend",
    prova
  });
});
var tia_default = router;

// src/routes/premium.ts
var import_express2 = require("express");

// src/services/fxRate.ts
var cache = null;
var CACHE_TTL_MS = 60 * 1e3;
var FALLBACK_USD_MXN = 18.5;
function num(value, field) {
  const n = parseFloat(value ?? "");
  if (Number.isNaN(n) || n < 0) throw new Error(`Bitso: campo '${field}' inv\xE1lido`);
  return n;
}
function fallbackTicker() {
  return {
    pair: "USD/MXN",
    rate: FALLBACK_USD_MXN,
    bid: FALLBACK_USD_MXN,
    ask: FALLBACK_USD_MXN,
    spread: 0,
    spreadPct: 0,
    volume24hUsd: 0,
    vwap24h: FALLBACK_USD_MXN,
    high24h: FALLBACK_USD_MXN,
    low24h: FALLBACK_USD_MXN,
    source: "bitso",
    isLive: false,
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function getUsdMxnTicker() {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.ticker;
  }
  try {
    const res = await fetch("https://api.bitso.com/v3/ticker/?book=usd_mxn", {
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`Bitso ticker respondi\xF3 ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.payload?.last) {
      throw new Error("Respuesta del ticker de Bitso sin campo 'last' v\xE1lido");
    }
    const p = data.payload;
    const rate = num(p.last, "last");
    if (rate <= 0) throw new Error("Tasa de Bitso inv\xE1lida");
    const bid = num(p.bid, "bid");
    const ask = num(p.ask, "ask");
    const mid = (bid + ask) / 2;
    const spread = Math.max(ask - bid, 0);
    const ticker = {
      pair: "USD/MXN",
      rate,
      bid,
      ask,
      spread: Number(spread.toFixed(4)),
      spreadPct: mid > 0 ? Number((spread / mid * 100).toFixed(4)) : 0,
      volume24hUsd: num(p.volume, "volume"),
      vwap24h: num(p.vwap, "vwap"),
      high24h: num(p.high, "high"),
      low24h: num(p.low, "low"),
      source: "bitso",
      isLive: true,
      fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    cache = { ticker, fetchedAt: now };
    return ticker;
  } catch (err) {
    console.warn("[fx] Bitso fallback:", err);
    return fallbackTicker();
  }
}
async function getUsdMxnRate() {
  const t = await getUsdMxnTicker();
  return { rate: t.rate, isLive: t.isLive };
}

// node_modules/@lifi/sdk/dist/esm/errors/utils/rootCause.js
var getRootCause = (e) => {
  let rootCause = e;
  while (rootCause?.cause) rootCause = rootCause.cause;
  return rootCause;
};

// node_modules/@lifi/sdk/dist/esm/errors/baseError.js
var BaseError = class extends Error {
  code;
  cause;
  constructor(name2, code, message, cause) {
    super(message);
    this.name = name2;
    this.code = code;
    this.cause = cause;
    const rootCause = getRootCause(this.cause);
    if (rootCause?.stack) this.stack = rootCause.stack;
  }
};

// node_modules/@lifi/sdk/dist/esm/errors/errors.js
var ValidationError = class extends BaseError {
  constructor(message) {
    super("ValidationError", 1001, message);
  }
};

// node_modules/@lifi/sdk/dist/esm/errors/httpError.js
var statusCodeToErrorClassificationMap = /* @__PURE__ */ new Map([
  [400, {
    type: "ValidationError",
    code: 1001
  }],
  [404, {
    type: "NotFoundError",
    code: 1006
  }],
  [409, {
    type: "SlippageError",
    code: 1011,
    message: "The slippage is larger than the defined threshold. Please request a new route to get a fresh quote."
  }],
  [424, {
    type: "ServerError",
    code: 1024
  }],
  [429, {
    type: "ServerError",
    code: 1023
  }],
  [500, {
    type: "ServerError",
    code: 1e3
  }]
]);
var getErrorClassificationFromStatusCode = (code) => statusCodeToErrorClassificationMap.get(code) ?? {
  type: "ServerError",
  code: 1e3
};
var createInitialMessage = (response) => {
  const status = `${response.status || response.status === 0 ? response.status : ""} ${response.statusText || ""}`.trim();
  return `Request failed with ${status ? `status code ${status}` : "an unknown error"}`;
};
var HTTPError = class extends BaseError {
  response;
  status;
  url;
  fetchOptions;
  type;
  responseBody;
  constructor(response, url, options) {
    const errorClassification = getErrorClassificationFromStatusCode(response.status);
    const additionalMessage = errorClassification?.message ? `
${errorClassification.message}` : "";
    const message = createInitialMessage(response) + additionalMessage;
    super("HTTPError", errorClassification.code, message);
    this.type = errorClassification.type;
    this.response = response;
    this.status = response.status;
    this.message = message;
    this.url = url;
    this.fetchOptions = options;
  }
  async buildAdditionalDetails() {
    if (this.type) this.message = `[${this.type}] ${this.message}`;
    try {
      this.responseBody = await this.response.json();
      if (this.responseBody?.message) this.message += this.message.endsWith(".") ? ` ${this.responseBody.message.toString()}` : `. ${this.responseBody.message.toString()}`;
    } catch {
    }
  }
};

// node_modules/@lifi/sdk/dist/esm/version.js
var name = "@lifi/sdk";
var version = "4.7.0";

// node_modules/@lifi/sdk/dist/esm/errors/SDKError.js
var SDKError = class extends Error {
  step;
  action;
  code;
  name = "SDKError";
  cause;
  constructor(cause, step, action) {
    const errorMessage = `${cause.message ? `[${cause.name}] ${cause.message}` : "Unknown error occurred"}
LI.FI SDK version: ${version}`;
    super(errorMessage);
    this.name = "SDKError";
    this.step = step;
    this.action = action;
    this.cause = cause;
    this.stack = this.cause.stack;
    this.code = cause.code;
  }
};

// node_modules/@lifi/sdk/dist/esm/utils/sleep.js
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(null), ms);
  });
}

// node_modules/@lifi/sdk/dist/esm/utils/withDedupe.js
var LruMap = class extends Map {
  maxSize;
  constructor(size) {
    super();
    this.maxSize = size;
  }
  set(key, value) {
    super.set(key, value);
    if (this.maxSize && this.size > this.maxSize) this.delete(this.keys().next().value);
    return this;
  }
};
var promiseCache = /* @__PURE__ */ new LruMap(8192);
function withDedupe(fn, { enabled = true, id }) {
  if (!enabled || !id) return fn();
  if (promiseCache.get(id)) return promiseCache.get(id);
  const promise = fn().finally(() => promiseCache.delete(id));
  promiseCache.set(id, promise);
  return promise;
}

// node_modules/@lifi/sdk/dist/esm/utils/request.js
var requestSettings = { retries: 1 };
var stripExtendRequestInitProperties = ({ retries, ...rest }) => ({ ...rest });
var request = async (config, url, options = { retries: requestSettings.retries }) => {
  const { userId, integrator, widgetVersion, apiKey, requestInterceptor } = config;
  if (!integrator) throw new SDKError(new ValidationError("You need to provide the Integrator property. Please see documentation https://docs.li.fi/integrate-li.fi-js-sdk/set-up-the-sdk"));
  options.retries = options.retries ?? requestSettings.retries;
  try {
    if (apiKey) options.headers = {
      ...options.headers,
      "x-lifi-api-key": apiKey
    };
    if (userId) options.headers = {
      ...options.headers,
      "x-lifi-userid": userId
    };
    if (widgetVersion) options.headers = {
      ...options.headers,
      "x-lifi-widget": widgetVersion
    };
    options.headers = {
      ...options.headers,
      "x-lifi-sdk": version
    };
    options.headers = {
      ...options.headers,
      "x-lifi-integrator": integrator
    };
    if (requestInterceptor) options = await requestInterceptor(options);
    const response = await fetch(url, stripExtendRequestInitProperties(options));
    if (!response.ok) throw new HTTPError(response, url, options);
    return await response.json();
  } catch (error) {
    const retries = options.retries ?? 0;
    if (retries > 0 && error.status === 500) {
      await sleep(500);
      return request(config, url, {
        ...options,
        retries: retries - 1
      });
    }
    await error.buildAdditionalDetails?.();
    throw new SDKError(error);
  }
};

// node_modules/@lifi/sdk/dist/esm/actions/getChains.js
var getChains = async (client2, params, options) => {
  return await _getChains(client2.config, params, options);
};
var _getChains = async (config, params, options) => {
  if (params) for (const key of Object.keys(params)) {
    const value = params[key];
    if (value === void 0 || value === null) delete params[key];
  }
  const urlSearchParams = new URLSearchParams(params).toString();
  return (await withDedupe(() => request(config, `${config.apiUrl}/chains?${urlSearchParams}`, { signal: options?.signal }), { id: `${getChains.name}.${urlSearchParams}` })).chains;
};

// node_modules/@lifi/types/src/_esm/chains/base.js
var ChainKey;
(function(ChainKey2) {
  ChainKey2["ETH"] = "eth";
  ChainKey2["POL"] = "pol";
  ChainKey2["BSC"] = "bsc";
  ChainKey2["DAI"] = "dai";
  ChainKey2["FTM"] = "ftm";
  ChainKey2["AVA"] = "ava";
  ChainKey2["ARB"] = "arb";
  ChainKey2["OPT"] = "opt";
  ChainKey2["ONE"] = "one";
  ChainKey2["FSN"] = "fsn";
  ChainKey2["MOR"] = "mor";
  ChainKey2["CEL"] = "cel";
  ChainKey2["FUS"] = "fus";
  ChainKey2["TLO"] = "tlo";
  ChainKey2["CRO"] = "cro";
  ChainKey2["BOB"] = "bob";
  ChainKey2["RSK"] = "rsk";
  ChainKey2["VEL"] = "vel";
  ChainKey2["MOO"] = "moo";
  ChainKey2["MAM"] = "mam";
  ChainKey2["AUR"] = "aur";
  ChainKey2["EVM"] = "evm";
  ChainKey2["ARN"] = "arn";
  ChainKey2["ERA"] = "era";
  ChainKey2["PZE"] = "pze";
  ChainKey2["LNA"] = "lna";
  ChainKey2["BAS"] = "bas";
  ChainKey2["SCL"] = "scl";
  ChainKey2["MOD"] = "mod";
  ChainKey2["MNT"] = "mnt";
  ChainKey2["BLS"] = "bls";
  ChainKey2["SEI"] = "sei";
  ChainKey2["FRA"] = "fra";
  ChainKey2["GRA"] = "gra";
  ChainKey2["IMX"] = "imx";
  ChainKey2["KAI"] = "kai";
  ChainKey2["XLY"] = "xly";
  ChainKey2["OPB"] = "opb";
  ChainKey2["WCC"] = "wcc";
  ChainKey2["LSK"] = "lsk";
  ChainKey2["ABS"] = "abs";
  ChainKey2["BER"] = "ber";
  ChainKey2["SON"] = "son";
  ChainKey2["UNI"] = "uni";
  ChainKey2["APE"] = "ape";
  ChainKey2["SOE"] = "soe";
  ChainKey2["INK"] = "ink";
  ChainKey2["LNS"] = "lns";
  ChainKey2["ETL"] = "etl";
  ChainKey2["HYP"] = "hyp";
  ChainKey2["XDC"] = "xdc";
  ChainKey2["BOC"] = "boc";
  ChainKey2["VIC"] = "vic";
  ChainKey2["FLR"] = "flr";
  ChainKey2["KAT"] = "kat";
  ChainKey2["VAN"] = "van";
  ChainKey2["RON"] = "ron";
  ChainKey2["PLU"] = "plu";
  ChainKey2["NIB"] = "nib";
  ChainKey2["HPL"] = "hpl";
  ChainKey2["PLA"] = "pla";
  ChainKey2["FLW"] = "flw";
  ChainKey2["HMI"] = "hmi";
  ChainKey2["MON"] = "mon";
  ChainKey2["STA"] = "sta";
  ChainKey2["MEG"] = "meg";
  ChainKey2["JOV"] = "jov";
  ChainKey2["MOP"] = "mop";
  ChainKey2["TEM"] = "tem";
  ChainKey2["ZEROG"] = "zerog";
  ChainKey2["PHR"] = "phr";
  ChainKey2["LTR"] = "ltr";
  ChainKey2["SOM"] = "som";
  ChainKey2["OUT"] = "out";
  ChainKey2["ARC"] = "arc";
  ChainKey2["INJ"] = "inj";
  ChainKey2["TER"] = "ter";
  ChainKey2["OAS"] = "oas";
  ChainKey2["SOL"] = "sol";
  ChainKey2["FOG"] = "fog";
  ChainKey2["SUI"] = "sui";
  ChainKey2["BTC"] = "btc";
  ChainKey2["BCH"] = "bch";
  ChainKey2["LTC"] = "ltc";
  ChainKey2["DGE"] = "dge";
  ChainKey2["ZEC"] = "zec";
  ChainKey2["TRN"] = "trn";
  ChainKey2["XLM"] = "xlm";
  ChainKey2["ARCT"] = "arct";
  ChainKey2["OPST"] = "opst";
  ChainKey2["BAST"] = "bast";
  ChainKey2["ARBS"] = "arbs";
  ChainKey2["ETHS"] = "eths";
})(ChainKey || (ChainKey = {}));
var ChainId;
(function(ChainId2) {
  ChainId2[ChainId2["ETH"] = 1] = "ETH";
  ChainId2[ChainId2["POL"] = 137] = "POL";
  ChainId2[ChainId2["BSC"] = 56] = "BSC";
  ChainId2[ChainId2["DAI"] = 100] = "DAI";
  ChainId2[ChainId2["FTM"] = 250] = "FTM";
  ChainId2[ChainId2["AVA"] = 43114] = "AVA";
  ChainId2[ChainId2["ARB"] = 42161] = "ARB";
  ChainId2[ChainId2["OPT"] = 10] = "OPT";
  ChainId2[ChainId2["ONE"] = 16666e5] = "ONE";
  ChainId2[ChainId2["FSN"] = 32659] = "FSN";
  ChainId2[ChainId2["MOR"] = 1285] = "MOR";
  ChainId2[ChainId2["CEL"] = 42220] = "CEL";
  ChainId2[ChainId2["FUS"] = 122] = "FUS";
  ChainId2[ChainId2["TLO"] = 40] = "TLO";
  ChainId2[ChainId2["CRO"] = 25] = "CRO";
  ChainId2[ChainId2["BOB"] = 288] = "BOB";
  ChainId2[ChainId2["RSK"] = 30] = "RSK";
  ChainId2[ChainId2["VEL"] = 106] = "VEL";
  ChainId2[ChainId2["MOO"] = 1284] = "MOO";
  ChainId2[ChainId2["MAM"] = 1088] = "MAM";
  ChainId2[ChainId2["AUR"] = 1313161554] = "AUR";
  ChainId2[ChainId2["EVM"] = 9001] = "EVM";
  ChainId2[ChainId2["ARN"] = 42170] = "ARN";
  ChainId2[ChainId2["ERA"] = 324] = "ERA";
  ChainId2[ChainId2["PZE"] = 1101] = "PZE";
  ChainId2[ChainId2["LNA"] = 59144] = "LNA";
  ChainId2[ChainId2["BAS"] = 8453] = "BAS";
  ChainId2[ChainId2["SCL"] = 534352] = "SCL";
  ChainId2[ChainId2["MOD"] = 34443] = "MOD";
  ChainId2[ChainId2["MNT"] = 5e3] = "MNT";
  ChainId2[ChainId2["BLS"] = 81457] = "BLS";
  ChainId2[ChainId2["SEI"] = 1329] = "SEI";
  ChainId2[ChainId2["FRA"] = 252] = "FRA";
  ChainId2[ChainId2["GRA"] = 1625] = "GRA";
  ChainId2[ChainId2["IMX"] = 13371] = "IMX";
  ChainId2[ChainId2["KAI"] = 8217] = "KAI";
  ChainId2[ChainId2["XLY"] = 196] = "XLY";
  ChainId2[ChainId2["OPB"] = 204] = "OPB";
  ChainId2[ChainId2["WCC"] = 480] = "WCC";
  ChainId2[ChainId2["LSK"] = 1135] = "LSK";
  ChainId2[ChainId2["ABS"] = 2741] = "ABS";
  ChainId2[ChainId2["BER"] = 80094] = "BER";
  ChainId2[ChainId2["SON"] = 146] = "SON";
  ChainId2[ChainId2["UNI"] = 130] = "UNI";
  ChainId2[ChainId2["APE"] = 33139] = "APE";
  ChainId2[ChainId2["SOE"] = 1868] = "SOE";
  ChainId2[ChainId2["INK"] = 57073] = "INK";
  ChainId2[ChainId2["LNS"] = 232] = "LNS";
  ChainId2[ChainId2["ETL"] = 42793] = "ETL";
  ChainId2[ChainId2["HYP"] = 999] = "HYP";
  ChainId2[ChainId2["XDC"] = 50] = "XDC";
  ChainId2[ChainId2["BOC"] = 60808] = "BOC";
  ChainId2[ChainId2["VIC"] = 88] = "VIC";
  ChainId2[ChainId2["FLR"] = 14] = "FLR";
  ChainId2[ChainId2["KAT"] = 747474] = "KAT";
  ChainId2[ChainId2["VAN"] = 1480] = "VAN";
  ChainId2[ChainId2["RON"] = 2020] = "RON";
  ChainId2[ChainId2["PLU"] = 98866] = "PLU";
  ChainId2[ChainId2["NIB"] = 6900] = "NIB";
  ChainId2[ChainId2["HPL"] = 1337] = "HPL";
  ChainId2[ChainId2["PLA"] = 9745] = "PLA";
  ChainId2[ChainId2["FLW"] = 747] = "FLW";
  ChainId2[ChainId2["HMI"] = 43111] = "HMI";
  ChainId2[ChainId2["MON"] = 143] = "MON";
  ChainId2[ChainId2["STA"] = 988] = "STA";
  ChainId2[ChainId2["MEG"] = 4326] = "MEG";
  ChainId2[ChainId2["JOV"] = 5734951] = "JOV";
  ChainId2[ChainId2["MOP"] = 2818] = "MOP";
  ChainId2[ChainId2["TEM"] = 4217] = "TEM";
  ChainId2[ChainId2["ZEROG"] = 16661] = "ZEROG";
  ChainId2[ChainId2["PHR"] = 1672] = "PHR";
  ChainId2[ChainId2["LTR"] = 3586256] = "LTR";
  ChainId2[ChainId2["SOM"] = 5031] = "SOM";
  ChainId2[ChainId2["OUT"] = 4663] = "OUT";
  ChainId2[ChainId2["ARC"] = 5042] = "ARC";
  ChainId2[ChainId2["INJ"] = 1776] = "INJ";
  ChainId2[ChainId2["TER"] = 1161011141099710] = "TER";
  ChainId2[ChainId2["OAS"] = 111971151099710] = "OAS";
  ChainId2[ChainId2["SOL"] = 1151111081099710] = "SOL";
  ChainId2[ChainId2["FOG"] = 1021111031099710] = "FOG";
  ChainId2[ChainId2["SUI"] = 927e13] = "SUI";
  ChainId2[ChainId2["BTC"] = 20000000000001] = "BTC";
  ChainId2[ChainId2["BCH"] = 20000000000002] = "BCH";
  ChainId2[ChainId2["LTC"] = 20000000000003] = "LTC";
  ChainId2[ChainId2["DGE"] = 20000000000004] = "DGE";
  ChainId2[ChainId2["ZEC"] = 20000000000005] = "ZEC";
  ChainId2[ChainId2["TRN"] = 728126428] = "TRN";
  ChainId2[ChainId2["XLM"] = 1201081091099710] = "XLM";
  ChainId2[ChainId2["ARCT"] = 5042002] = "ARCT";
  ChainId2[ChainId2["OPST"] = 11155420] = "OPST";
  ChainId2[ChainId2["BAST"] = 84532] = "BAST";
  ChainId2[ChainId2["ARBS"] = 421614] = "ARBS";
  ChainId2[ChainId2["ETHS"] = 11155111] = "ETHS";
})(ChainId || (ChainId = {}));

// node_modules/@lifi/types/src/_esm/chains/Chain.js
var ChainType;
(function(ChainType2) {
  ChainType2["EVM"] = "EVM";
  ChainType2["SVM"] = "SVM";
  ChainType2["MVM"] = "MVM";
  ChainType2["UTXO"] = "UTXO";
  ChainType2["TVM"] = "TVM";
  ChainType2["STL"] = "STL";
})(ChainType || (ChainType = {}));

// node_modules/@lifi/sdk/dist/esm/utils/toQueryString.js
var isPrimitive = (value) => typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint";
var serialize = (key, value) => {
  if (value === void 0 || value === null) return [];
  if (isPrimitive(value)) return [`${key}=${encodeURIComponent(String(value))}`];
  if (Array.isArray(value)) {
    if (value.every(isPrimitive)) return [`${key}=${encodeURIComponent(value.join(","))}`];
    return value.flatMap((item, index) => serialize(`${key}[${index}]`, item));
  }
  return Object.entries(value).flatMap(([subKey, subValue]) => serialize(`${key}[${subKey}]`, subValue));
};
var toQueryString = (params) => Object.entries(params).flatMap(([key, value]) => serialize(key, value)).join("&");

// node_modules/@lifi/sdk/dist/esm/actions/getQuote.js
async function getQuote(client2, params, options) {
  for (const requiredParameter of [
    "fromChain",
    "fromToken",
    "fromAddress",
    "toChain",
    "toToken"
  ]) if (!params[requiredParameter]) throw new SDKError(new ValidationError(`Required parameter "${requiredParameter}" is missing.`));
  const isFromAmountRequest = "fromAmount" in params && params.fromAmount !== void 0;
  const isToAmountRequest = "toAmount" in params && params.toAmount !== void 0;
  if (!isFromAmountRequest && !isToAmountRequest) throw new SDKError(new ValidationError('Required parameter "fromAmount" or "toAmount" is missing.'));
  if (isFromAmountRequest && isToAmountRequest) throw new SDKError(new ValidationError('Cannot provide both "fromAmount" and "toAmount" parameters.'));
  params.integrator ??= client2.config.integrator;
  params.order ??= client2.config.routeOptions?.order;
  params.slippage ??= client2.config.routeOptions?.slippage;
  params.referrer ??= client2.config.routeOptions?.referrer;
  params.fee ??= client2.config.routeOptions?.fee;
  params.allowBridges ??= client2.config.routeOptions?.bridges?.allow;
  params.denyBridges ??= client2.config.routeOptions?.bridges?.deny;
  params.preferBridges ??= client2.config.routeOptions?.bridges?.prefer;
  params.allowExchanges ??= client2.config.routeOptions?.exchanges?.allow;
  params.denyExchanges ??= client2.config.routeOptions?.exchanges?.deny;
  params.preferExchanges ??= client2.config.routeOptions?.exchanges?.prefer;
  for (const key of Object.keys(params)) if (params[key] === void 0 || params[key] === null) delete params[key];
  return await request(client2.config, `${client2.config.apiUrl}/${isFromAmountRequest ? "quote" : "quote/toAmount"}?${toQueryString(params)}`, { signal: options?.signal });
}

// node_modules/@lifi/sdk/dist/esm/utils/checkPackageUpdates.js
var checkPackageUpdates = async (packageName, packageVersion) => {
  try {
    const pkgName = packageName ?? "@lifi/sdk";
    const latestVersion = (await (await fetch(`https://registry.npmjs.org/${pkgName}/latest`)).json()).version;
    const currentVersion = packageVersion ?? "4.7.0";
    if (latestVersion > currentVersion) console.warn(`${pkgName}: new package version is available. Please update as soon as possible to enjoy the newest features. Current version: ${currentVersion}. Latest version: ${latestVersion}.`);
  } catch (_error) {
  }
};

// node_modules/@lifi/sdk/dist/esm/core/utils.js
function getRpcUrlsFromChains(existingRpcUrls, chains, skipChains) {
  const rpcUrlsFromChains = chains.reduce((rpcUrls, chain) => {
    if (chain.metamask?.rpcUrls?.length) rpcUrls[chain.id] = chain.metamask.rpcUrls;
    return rpcUrls;
  }, {});
  const result = { ...existingRpcUrls };
  for (const rpcUrlsKey in rpcUrlsFromChains) {
    const chainId = Number(rpcUrlsKey);
    const urls = rpcUrlsFromChains[chainId];
    if (!urls?.length) continue;
    if (!result[chainId]?.length) result[chainId] = Array.from(urls);
    else if (!skipChains?.includes(chainId)) {
      const filteredUrls = urls.filter((url) => !result[chainId]?.includes(url));
      result[chainId].push(...filteredUrls);
    }
  }
  return result;
}

// node_modules/@lifi/sdk/dist/esm/client/getClientStorage.js
var chainsRefreshInterval = 216e5;
var getClientStorage = (config) => {
  let _chains = [];
  let _rpcUrls = { ...config.rpcUrls };
  let _chainsUpdatedAt;
  const updateRpcUrls = () => {
    _rpcUrls = { ...config.rpcUrls };
    _rpcUrls = getRpcUrlsFromChains(_rpcUrls, _chains, [ChainId.SOL]);
  };
  return {
    get needReset() {
      return !_chainsUpdatedAt || Date.now() - _chainsUpdatedAt >= chainsRefreshInterval;
    },
    setChains(chains) {
      _chains = chains;
      _chainsUpdatedAt = Date.now();
      updateRpcUrls();
    },
    async getChains() {
      if (!config.preloadChains) return _chains;
      if (this.needReset || !_chains.length) {
        _chains = await _getChains(config, { chainTypes: [
          ChainType.EVM,
          ChainType.SVM,
          ChainType.UTXO,
          ChainType.MVM,
          ChainType.TVM,
          ChainType.STL
        ] });
        _chainsUpdatedAt = Date.now();
        updateRpcUrls();
      }
      return _chains;
    },
    async getRpcUrls() {
      await this.getChains();
      return _rpcUrls;
    }
  };
};

// node_modules/@lifi/sdk/dist/esm/client/createClient.js
function createClient(options) {
  if (!options.integrator) throw new Error("Integrator not found. Please see documentation https://docs.li.fi/integrate-li.fi-js-sdk/set-up-the-sdk");
  if (!options.disableVersionCheck && process.env.NODE_ENV === "development") checkPackageUpdates(name, version);
  const { providers, ...configOptions } = options;
  const _config = {
    ...configOptions,
    apiUrl: configOptions?.apiUrl ?? "https://li.quest/v1",
    rpcUrls: configOptions?.rpcUrls ?? {},
    debug: configOptions?.debug ?? false,
    preloadChains: configOptions?.preloadChains ?? true,
    integrator: configOptions?.integrator ?? "lifi-sdk"
  };
  let _providers = providers ?? [];
  const _storage = getClientStorage(_config);
  const client2 = {
    get config() {
      return _config;
    },
    get providers() {
      return _providers;
    },
    getProvider(type) {
      return this.providers.find((provider) => provider.type === type);
    },
    setProviders(newProviders) {
      const providerMap = new Map(this.providers.map((provider) => [provider.type, provider]));
      for (const provider of newProviders) providerMap.set(provider.type, provider);
      _providers = Array.from(providerMap.values());
    },
    setChains(chains) {
      _storage.setChains(chains);
    },
    async getChains() {
      return await _storage.getChains();
    },
    async getChainById(chainId) {
      const chain = (await this.getChains())?.find((chain2) => chain2.id === chainId);
      if (!chain) throw new Error(`ChainId ${chainId} not found`);
      return chain;
    },
    async getRpcUrls() {
      return await _storage.getRpcUrls();
    },
    async getRpcUrlsByChainId(chainId) {
      const chainRpcUrls = (await this.getRpcUrls())[chainId];
      if (!chainRpcUrls?.length) throw new Error(`RPC URL not found for chainId: ${chainId}`);
      return chainRpcUrls;
    }
  };
  function extend(base) {
    return (extendFn) => {
      const extensions = extendFn(base);
      const extended = {
        ...base,
        ...extensions
      };
      return Object.assign(extended, { extend: extend(extended) });
    };
  }
  return Object.assign(client2, { extend: extend(client2) });
}

// src/services/lifiQuote.ts
var USDC_SOLANA = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
var USDC_BY_CHAIN = {
  ARB: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  BASE: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  POL: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
};
var client = null;
function getLifiClient() {
  if (!client) {
    client = createClient({ integrator: "remesa-liquidez-ia" });
  }
  return client;
}
async function quoteBridgeToSolana(params) {
  const fromChain = params.fromChain ?? "ARB";
  const fromToken = USDC_BY_CHAIN[fromChain];
  if (!fromToken) {
    throw new Error(
      `Cadena origen no soportada: ${fromChain}. Usa ARB, BASE o POL.`
    );
  }
  const quote = await getQuote(getLifiClient(), {
    fromChain,
    toChain: "SOL",
    fromToken,
    toToken: USDC_SOLANA,
    fromAddress: params.fromAddress,
    toAddress: params.toAddress,
    fromAmount: params.fromAmount
  });
  const estimate = quote.estimate;
  if (!estimate) {
    throw new Error("LI.FI quote sin estimate");
  }
  const step = quote.includedSteps?.[0];
  const feeCosts = estimate.feeCosts ?? step?.estimate?.feeCosts ?? [];
  const totalFeeUsd = feeCosts.reduce((acc, f) => acc + parseFloat(f.amountUSD ?? "0"), 0).toFixed(4);
  return {
    ok: true,
    toAmount: estimate.toAmount,
    toAmountMin: estimate.toAmountMin,
    estimatedTime: estimate.executionDuration,
    tool: quote.toolDetails?.name ?? estimate.tool ?? step?.tool ?? "unknown",
    feeCostUsd: totalFeeUsd
  };
}

// src/routes/premium.ts
var router2 = (0, import_express2.Router)();
var BridgeQuoteQuery = external_exports.object({
  fromAddress: external_exports.string().regex(/^0x[a-fA-F0-9]{40}$/, "fromAddress debe ser una direcci\xF3n EVM (0x + 40 hex)"),
  toAddress: external_exports.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "toAddress debe ser una pubkey Solana base58"),
  // Unidades base USDC (6 decimales EVM): entero positivo, máx ~10M USDC.
  fromAmount: external_exports.string().regex(/^[1-9]\d{0,12}$/, "fromAmount debe ser un entero positivo en unidades base USDC"),
  fromChain: external_exports.enum(["ARB", "BASE", "POL"]).default("ARB")
});
router2.get("/bridge-quote", async (req, res) => {
  const parsed = BridgeQuoteQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      message: "Par\xE1metros inv\xE1lidos: fromAddress (EVM 0x\u2026), toAddress (Solana base58), fromAmount (USDC base units), fromChain (ARB|BASE|POL).",
      details: parsed.error.flatten().fieldErrors,
      example: "/premium/bridge-quote?fromAddress=0x\u2026&toAddress=<SOL_PUBKEY>&fromAmount=10000000"
    });
    return;
  }
  const { fromAddress, toAddress, fromAmount, fromChain } = parsed.data;
  try {
    const result = await quoteBridgeToSolana({
      fromAddress,
      toAddress,
      fromAmount,
      fromChain
    });
    res.json({
      ok: true,
      fromChain,
      fromAmount,
      toChain: "SOL",
      toAmount: result.toAmount,
      toAmountMin: result.toAmountMin,
      toAmountHuman: (parseInt(result.toAmount, 10) / 1e6).toFixed(2),
      estimatedSeconds: result.estimatedTime,
      bridge: result.tool,
      feeCostUsd: result.feeCostUsd,
      note: "Premium LI.FI quote \u2014 pago x402 verificado on-chain."
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /premium/bridge-quote] error:", err);
    res.status(500).json({ ok: false, message });
  }
});
router2.get("/fx", async (_req, res) => {
  try {
    const { rate, isLive } = await getUsdMxnRate();
    res.json({
      ok: true,
      pair: "USD/MXN",
      rate,
      isLive,
      source: "bitso",
      note: "Premium FX tick \u2014 pago x402 verificado on-chain."
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /premium/fx] error:", err);
    res.status(500).json({ ok: false, message });
  }
});
var premium_default = router2;

// src/routes/v1.ts
var import_express3 = require("express");

// src/services/routeEstimator.ts
var BITSO_TAKER_FEE = 65e-4;
var USDC_ONRAMP_FEE = 1e-3;
var USDC_OFFRAMP_FEE = 5e-3;
var USDC_NETWORK_FLAT_USD = 0.01;
var SPEI_FLAT_FEE_USD = 3;
var SPEI_FX_MARGIN = 0.015;
var round2 = (n) => Number(n.toFixed(2));
var round4 = (n) => Number(n.toFixed(4));
async function estimateRoutes(amountUsd) {
  const t = await getUsdMxnTicker();
  const mid = (t.bid + t.ask) / 2;
  const option = (route, label, mxnOut, etaMinutes, assumptions) => {
    const costUsd = amountUsd - mxnOut / mid;
    return {
      route,
      label,
      mxnOut: round2(mxnOut),
      effectiveRate: round4(mxnOut / amountUsd),
      totalCostUsd: round2(costUsd),
      totalCostPct: round4(costUsd / amountUsd * 100),
      etaMinutes,
      assumptions
    };
  };
  const bitso = option(
    "bitso_directo",
    "Bitso usd_mxn spot + retiro SPEI",
    amountUsd * t.bid * (1 - BITSO_TAKER_FEE),
    15,
    [
      `taker fee ${(BITSO_TAKER_FEE * 100).toFixed(2)}% (tier base)`,
      `ejecuta contra bid ${t.bid}`,
      "retiro SPEI MXN sin costo"
    ]
  );
  const usdcNet = Math.max(amountUsd - USDC_NETWORK_FLAT_USD, 0);
  const stablecoin = option(
    "stablecoin_usdc",
    "USDC v\xEDa Stellar + off-ramp MXN",
    usdcNet * (1 - USDC_ONRAMP_FEE) * mid * (1 - USDC_OFFRAMP_FEE),
    10,
    [
      `on-ramp USD\u2192USDC ${(USDC_ONRAMP_FEE * 100).toFixed(2)}%`,
      `off-ramp USDC\u2192MXN ${(USDC_OFFRAMP_FEE * 100).toFixed(2)}% sobre mid`,
      `fees de red Stellar ~$${USDC_NETWORK_FLAT_USD.toFixed(2)}`
    ]
  );
  const speiNet = Math.max(amountUsd - SPEI_FLAT_FEE_USD, 0);
  const spei = option(
    "spei_tradicional",
    "Wire internacional \u2192 SPEI",
    speiNet * mid * (1 - SPEI_FX_MARGIN),
    240,
    [
      `fee fijo $${SPEI_FLAT_FEE_USD.toFixed(2)}`,
      `margen FX ${(SPEI_FX_MARGIN * 100).toFixed(2)}% sobre mid`,
      "acreditaci\xF3n mismo d\xEDa h\xE1bil"
    ]
  );
  const options = [bitso, stablecoin, spei];
  const best = options.reduce((a, b) => b.mxnOut > a.mxnOut ? b : a);
  return {
    apiVersion: "1",
    amountUsd,
    midRate: round4(mid),
    rateIsLive: t.isLive,
    rateSource: "bitso",
    best: best.route,
    options,
    disclaimer: "Estimaci\xF3n con supuestos publicados por opci\xF3n; no es una cotizaci\xF3n ejecutable.",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// src/services/alerts.ts
var import_node_crypto = require("node:crypto");
var import_promises = require("node:dns/promises");
var import_node_net = require("node:net");
var MAX_ALERTS = 100;
var WEBHOOK_TIMEOUT_MS = 5e3;
var REDIS_KEY = "tia:fx-alerts";
function ttlHours() {
  const n = Number(process.env.ALERTS_TTL_HOURS);
  return Number.isFinite(n) && n >= 0 ? n : 48;
}
function maxRetries() {
  const n = Number(process.env.ALERTS_MAX_RETRIES);
  return Number.isFinite(n) && n >= 1 ? n : 3;
}
function maxPerClient() {
  const n = Number(process.env.ALERTS_MAX_PER_CLIENT);
  return Number.isFinite(n) && n >= 1 ? n : 5;
}
function isBlockedIPv4(ip) {
  const [a, b] = ip.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && (b === 168 || b === 0)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}
function isBlockedIPv6(ip) {
  const h = ip.toLowerCase();
  if (h === "::" || h === "::1") return true;
  if (/^fe[89ab]/.test(h)) return true;
  if (/^f[cd]/.test(h)) return true;
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIPv4(mapped[1]);
  if (h.startsWith("::ffff:")) return true;
  return false;
}
function isBlockedIp(ip) {
  const kind = (0, import_node_net.isIP)(ip);
  if (kind === 4) return isBlockedIPv4(ip);
  if (kind === 6) return isBlockedIPv6(ip);
  return true;
}
var RAW_LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])([:/?#]|$)/i;
async function checkWebhookTarget(raw, opts) {
  const allowLoopback = opts?.allowLoopback ?? process.env.NODE_ENV !== "production";
  if (typeof raw !== "string" || !raw.trim() || raw.length > 500) {
    return { ok: false, error: "webhookUrl requerida (m\xE1x 500 chars)" };
  }
  const trimmed = raw.trim();
  if (allowLoopback && RAW_LOOPBACK.test(trimmed)) {
    try {
      return { ok: true, url: new URL(trimmed).toString() };
    } catch {
      return { ok: false, error: "webhookUrl inv\xE1lida" };
    }
  }
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "webhookUrl inv\xE1lida" };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "webhookUrl debe ser https://" };
  }
  if (url.username || url.password) {
    return { ok: false, error: "webhookUrl no admite credenciales embebidas" };
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if ((0, import_node_net.isIP)(hostname)) {
    if (isBlockedIp(hostname)) {
      return { ok: false, error: "webhookUrl no puede apuntar a IPs privadas/reservadas" };
    }
    return { ok: true, url: url.toString() };
  }
  try {
    const addrs = await (0, import_promises.lookup)(hostname, { all: true });
    if (addrs.length === 0) {
      return { ok: false, error: "webhookUrl no resuelve" };
    }
    for (const { address } of addrs) {
      if (isBlockedIp(address)) {
        return { ok: false, error: "webhookUrl resuelve a una IP privada/reservada" };
      }
    }
  } catch {
    return { ok: false, error: "webhookUrl no resuelve" };
  }
  return { ok: true, url: url.toString() };
}
async function validateAlertInput(body, client2) {
  const b = body ?? {};
  const threshold = Number(b.threshold);
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold >= 1e3) {
    return { ok: false, error: "threshold debe ser un n\xFAmero entre 0 y 1000 (MXN por USD)" };
  }
  const direction = b.direction;
  if (direction !== "above" && direction !== "below") {
    return { ok: false, error: 'direction debe ser "above" o "below"' };
  }
  const target = await checkWebhookTarget(
    typeof b.webhookUrl === "string" ? b.webhookUrl : ""
  );
  if (!target.ok || !target.url) {
    return { ok: false, error: target.error ?? "webhookUrl inv\xE1lida" };
  }
  const now = Date.now();
  return {
    ok: true,
    alert: {
      id: (0, import_node_crypto.randomUUID)(),
      pair: "USD/MXN",
      direction,
      threshold,
      webhookUrl: target.url,
      client: client2,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlHours() * 36e5).toISOString(),
      failures: 0
    }
  };
}
function upstashStore(url, token) {
  async function cmd(command) {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command)
    });
    if (!res.ok) throw new Error(`Upstash respondi\xF3 ${res.status}`);
    const data = await res.json();
    return data.result;
  }
  return {
    kind: "upstash",
    async put(alert) {
      await cmd(["HSET", REDIS_KEY, alert.id, JSON.stringify(alert)]);
    },
    async list() {
      const flat = await cmd(["HGETALL", REDIS_KEY]);
      const alerts = [];
      for (let i = 1; i < flat.length; i += 2) {
        try {
          alerts.push(JSON.parse(flat[i]));
        } catch {
        }
      }
      return alerts;
    },
    async remove(id) {
      await cmd(["HDEL", REDIS_KEY, id]);
    },
    async count() {
      return cmd(["HLEN", REDIS_KEY]);
    }
  };
}
function memoryStore() {
  const map = /* @__PURE__ */ new Map();
  return {
    kind: "memory",
    async put(alert) {
      map.set(alert.id, alert);
    },
    async list() {
      return [...map.values()];
    },
    async remove(id) {
      map.delete(id);
    },
    async count() {
      return map.size;
    }
  };
}
var store = null;
function getAlertStore() {
  if (store) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) {
    store = upstashStore(url, token);
  } else {
    console.warn(
      "[TIA] alerts: sin UPSTASH_REDIS_REST_URL/TOKEN \u2014 store en memoria (ef\xEDmero; en Vercel las alertas NO sobreviven entre invocaciones)"
    );
    store = memoryStore();
  }
  return store;
}
async function registerAlert(body, client2) {
  const parsed = await validateAlertInput(body, client2 || "unknown");
  if (!parsed.ok) {
    return { status: 400, payload: { ok: false, error: parsed.error } };
  }
  const s = getAlertStore();
  if (await s.count() >= MAX_ALERTS) {
    return { status: 429, payload: { ok: false, error: `l\xEDmite global de ${MAX_ALERTS} alertas activas` } };
  }
  const mine = (await s.list()).filter((a) => a.client === parsed.alert.client);
  if (mine.length >= maxPerClient()) {
    return {
      status: 429,
      payload: { ok: false, error: `l\xEDmite de ${maxPerClient()} alertas activas por cliente` }
    };
  }
  await s.put(parsed.alert);
  const { id, pair, direction, threshold, webhookUrl, createdAt, expiresAt } = parsed.alert;
  return {
    status: 201,
    payload: {
      ok: true,
      apiVersion: "1",
      alertId: id,
      status: "active",
      pair,
      direction,
      threshold,
      webhookUrl,
      createdAt,
      expiresAt,
      maxRetries: maxRetries(),
      store: s.kind,
      note: "One-shot: dispara una vez al cruzar el umbral y se elimina. Expira sin disparar tras el TTL. El disparo lo ejecuta POST /v1/alert/check (cron \u2014 ver SPEC.md)."
    }
  };
}
async function checkAndFireAlerts() {
  const s = getAlertStore();
  const base = {
    ok: true,
    rate: null,
    rateIsLive: false,
    checked: 0,
    fired: 0,
    expired: 0,
    webhookErrors: 0,
    dropped: 0,
    store: s.kind
  };
  const t = await getUsdMxnTicker();
  if (!t.isLive) {
    return { ...base, skipped: "fx_not_live" };
  }
  const alerts = await s.list();
  const result = { ...base, rate: t.rate, rateIsLive: true, checked: alerts.length };
  const now = Date.now();
  for (const alert of alerts) {
    if (now >= Date.parse(alert.expiresAt)) {
      await s.remove(alert.id);
      result.expired++;
      continue;
    }
    const crossed = alert.direction === "above" ? t.rate >= alert.threshold : t.rate <= alert.threshold;
    if (!crossed) continue;
    const target = await checkWebhookTarget(alert.webhookUrl);
    if (!target.ok) {
      console.warn(`[TIA] alert ${alert.id} destino bloqueado al disparar: ${target.error}`);
      await s.remove(alert.id);
      result.dropped++;
      continue;
    }
    try {
      const res = await fetch(alert.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "fx-alert",
          alertId: alert.id,
          pair: alert.pair,
          direction: alert.direction,
          threshold: alert.threshold,
          rate: t.rate,
          source: t.source,
          firedAt: (/* @__PURE__ */ new Date()).toISOString()
        }),
        redirect: "manual",
        // jamás seguir redirects: 3xx cuenta como fallo
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS)
      });
      await res.body?.cancel().catch(() => void 0);
      if (!res.ok) throw new Error(`webhook respondi\xF3 ${res.status}`);
      await s.remove(alert.id);
      result.fired++;
    } catch (err) {
      result.webhookErrors++;
      alert.failures += 1;
      if (alert.failures >= maxRetries()) {
        console.warn(`[TIA] alert ${alert.id} eliminada tras ${alert.failures} fallos:`, err);
        await s.remove(alert.id);
        result.dropped++;
      } else {
        await s.put(alert);
        console.warn(
          `[TIA] alert ${alert.id} webhook fall\xF3 (${alert.failures}/${maxRetries()}):`,
          err
        );
      }
    }
  }
  return result;
}

// src/routes/v1.ts
var router3 = (0, import_express3.Router)();
router3.get("/quote", async (_req, res) => {
  try {
    const t = await getUsdMxnTicker();
    res.json({
      ok: true,
      apiVersion: "1",
      pair: t.pair,
      rate: t.rate,
      bid: t.bid,
      ask: t.ask,
      spread: t.spread,
      spreadPct: t.spreadPct,
      volume24hUsd: t.volume24hUsd,
      vwap24h: t.vwap24h,
      high24h: t.high24h,
      low24h: t.low24h,
      source: t.source,
      isLive: t.isLive,
      generatedAt: t.fetchedAt
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /v1/quote] error:", err);
    res.status(500).json({ ok: false, message });
  }
});
router3.get("/route", async (req, res) => {
  const amount = Number(req.query.amount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 5e4) {
    res.status(400).json({
      ok: false,
      error: "amount requerido en USD, entre 1 y 50000",
      example: "/v1/route?amount=100"
    });
    return;
  }
  try {
    const estimate = await estimateRoutes(amount);
    res.json({ ok: true, ...estimate });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /v1/route] error:", err);
    res.status(500).json({ ok: false, message });
  }
});
router3.post("/alert", async (req, res) => {
  try {
    const { status, payload } = await registerAlert(req.body, req.ip ?? "unknown");
    res.status(status).json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /v1/alert] error:", err);
    res.status(500).json({ ok: false, message });
  }
});
router3.post("/alert/check", requireCronSecret, async (_req, res) => {
  try {
    const result = await checkAndFireAlerts();
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /v1/alert/check] error:", err);
    res.status(500).json({ ok: false, message });
  }
});
var v1_default = router3;

// src/middleware/publicOrigin.ts
function publicOrigin() {
  const raw = process.env.PUBLIC_BASE_URL?.trim();
  let origin = null;
  if (raw) {
    try {
      origin = new URL(raw);
    } catch {
      console.warn(
        `[TIA] PUBLIC_BASE_URL inv\xE1lida ("${raw}") \u2014 fallback a X-Forwarded-Proto`
      );
    }
  }
  return (req, _res, next) => {
    if (origin) {
      Object.defineProperty(req, "protocol", {
        value: origin.protocol.replace(/:$/, ""),
        configurable: true
      });
      req.headers.host = origin.host;
    }
    next();
  };
}

// src/services/kvStore.ts
function hasDurableKv() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}
function upstashBackend(url, token) {
  const base = url.replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
  async function pipeline(commands) {
    const res = await fetch(`${base}/pipeline`, {
      method: "POST",
      headers,
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(3e3)
    });
    if (!res.ok) throw new Error(`Upstash pipeline respondi\xF3 ${res.status}`);
    const data = await res.json();
    return data.map((d) => d.result);
  }
  return {
    kind: "upstash",
    async claimOnce(key, ttlMs) {
      const [result] = await pipeline([
        ["SET", key, "1", "NX", "PX", ttlMs]
      ]);
      return result === "OK";
    },
    async del(key) {
      await pipeline([["DEL", key]]);
    },
    async slidingWindowHit(key, windowMs, member) {
      const now = Date.now();
      const [, , count] = await pipeline([
        ["ZREMRANGEBYSCORE", key, 0, now - windowMs],
        ["ZADD", key, now, member],
        ["ZCARD", key],
        ["PEXPIRE", key, windowMs]
      ]);
      return count;
    }
  };
}
function memoryBackend() {
  const claims = /* @__PURE__ */ new Map();
  const windows = /* @__PURE__ */ new Map();
  function gc(now) {
    if (claims.size > 1e4) {
      for (const [k, exp] of claims) if (exp <= now) claims.delete(k);
    }
    if (windows.size > 1e4) {
      for (const [k, hits] of windows) {
        if (hits.length === 0 || hits[hits.length - 1] < now - 3e5) {
          windows.delete(k);
        }
      }
    }
  }
  return {
    kind: "memory",
    async claimOnce(key, ttlMs) {
      const now = Date.now();
      gc(now);
      const existing = claims.get(key);
      if (existing !== void 0 && existing > now) return false;
      claims.set(key, now + ttlMs);
      return true;
    },
    async del(key) {
      claims.delete(key);
    },
    async slidingWindowHit(key, windowMs, _member) {
      const now = Date.now();
      gc(now);
      const hits = (windows.get(key) ?? []).filter((t) => t > now - windowMs);
      hits.push(now);
      windows.set(key, hits);
      return hits.length;
    }
  };
}
var backend = null;
function getKvBackend() {
  if (backend) return backend;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) {
    backend = upstashBackend(url, token);
  } else {
    console.warn(
      "[TIA] kvStore: sin UPSTASH_REDIS_REST_URL/TOKEN \u2014 rate limit y replay guard en memoria POR INSTANCIA (en Vercel cada invocaci\xF3n puede ser una instancia distinta; configura Upstash para que los l\xEDmites sean durables)"
    );
    backend = memoryBackend();
  }
  return backend;
}

// src/middleware/rateLimit.ts
function envInt(name2, fallback) {
  const n = Number(process.env[name2]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
function rateLimit(opts) {
  return async (req, res, next) => {
    const ip = req.ip ?? "unknown";
    const key = `tia:rl:${opts.keyPrefix}:${ip}`;
    let count;
    try {
      const kv = getKvBackend();
      count = await kv.slidingWindowHit(
        key,
        opts.windowMs,
        `${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
      );
    } catch (err) {
      console.warn(
        `[TIA] rateLimit(${opts.keyPrefix}): store fall\xF3 \u2014 request pasa sin contar:`,
        err instanceof Error ? err.message : err
      );
      next();
      return;
    }
    if (count > opts.max) {
      res.setHeader("Retry-After", Math.ceil(opts.windowMs / 1e3));
      res.status(429).json({
        ok: false,
        error: "rate_limited",
        message: `M\xE1ximo ${opts.max} requests por ${Math.ceil(opts.windowMs / 1e3)}s por cliente. Reintenta m\xE1s tarde.`
      });
      return;
    }
    next();
  };
}

// src/middleware/paymentGuard.ts
var import_node_crypto2 = require("node:crypto");
var MAX_PAYMENT_HEADER_BYTES = 8 * 1024;
function getEffectivePaymentHeader(req) {
  const v2 = req.headers["payment-signature"];
  if (typeof v2 === "string" && v2.length > 0) {
    return { header: "payment-signature", value: v2 };
  }
  const v1 = req.headers["x-payment"];
  if (typeof v1 === "string" && v1.length > 0) {
    return { header: "x-payment", value: v1 };
  }
  return null;
}
function paymentHeaderLimits() {
  return (req, res, next) => {
    const v2 = req.headers["payment-signature"];
    const v1 = req.headers["x-payment"];
    if (Array.isArray(v2)) {
      res.status(400).json({
        ok: false,
        error: "invalid_payment_header",
        message: "Se recibi\xF3 m\xE1s de un header payment-signature."
      });
      return;
    }
    if (Array.isArray(v1)) {
      res.status(400).json({
        ok: false,
        error: "invalid_payment_header",
        message: "Se recibi\xF3 m\xE1s de un header x-payment."
      });
      return;
    }
    const hasV2 = typeof v2 === "string" && v2.length > 0;
    const hasV1 = typeof v1 === "string" && v1.length > 0;
    if (hasV2 && hasV1 && v2 !== v1) {
      res.status(400).json({
        ok: false,
        error: "conflicting_payment_headers",
        message: "Se recibieron payment-signature y x-payment con valores diferentes. Env\xEDa solo uno."
      });
      return;
    }
    const effective = getEffectivePaymentHeader(req);
    if (effective && Buffer.byteLength(effective.value, "utf8") > MAX_PAYMENT_HEADER_BYTES) {
      res.status(400).json({
        ok: false,
        error: "payment_header_too_large",
        message: `El header de pago supera el m\xE1ximo de ${MAX_PAYMENT_HEADER_BYTES} bytes.`
      });
      return;
    }
    next();
  };
}
function replayStrict() {
  const override = process.env.X402_REPLAY_STRICT;
  if (override === "true") return true;
  if (override === "false") return false;
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}
function paymentReplayGuard() {
  return async (req, res, next) => {
    const effective = getEffectivePaymentHeader(req);
    if (!effective) {
      next();
      return;
    }
    const strict = replayStrict();
    const kv = getKvBackend();
    if (strict && kv.kind !== "upstash") {
      console.error(
        "[TIA] paymentReplayGuard: producci\xF3n sin store durable \u2014 request pagado rechazado (configura UPSTASH_REDIS_REST_URL/TOKEN)"
      );
      res.status(503).json({
        ok: false,
        error: "replay_protection_unavailable",
        message: "El servidor no puede garantizar protecci\xF3n anti-replay ahora mismo. Reintenta m\xE1s tarde."
      });
      return;
    }
    const digest = (0, import_node_crypto2.createHash)("sha256").update(effective.value).update("\n").update(`${req.method} ${req.originalUrl}`).digest("hex");
    const key = `tia:xpay:${digest}`;
    const ttlMs = envInt("X402_REPLAY_TTL_SECONDS", 900) * 1e3;
    let first;
    try {
      first = await kv.claimOnce(key, ttlMs);
    } catch (err) {
      console.warn(
        "[TIA] paymentReplayGuard: store fall\xF3:",
        err instanceof Error ? err.message : err
      );
      if (strict) {
        res.status(503).json({
          ok: false,
          error: "replay_protection_unavailable",
          message: "El servidor no puede garantizar protecci\xF3n anti-replay ahora mismo. Reintenta m\xE1s tarde."
        });
        return;
      }
      next();
      return;
    }
    if (!first) {
      console.warn(
        `[TIA] prueba de pago reusada bloqueada (header=${effective.header}, sha256=${digest.slice(0, 16)}\u2026)`
      );
      res.status(409).json({
        ok: false,
        error: "payment_replayed",
        message: "Esta prueba de pago ya fue usada. Cada request requiere un pago firmado nuevo."
      });
      return;
    }
    res.on("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        kv.del(key).catch(
          (err) => console.warn(
            "[TIA] paymentReplayGuard: no se pudo liberar la claim:",
            err instanceof Error ? err.message : err
          )
        );
      }
    });
    next();
  };
}

// src/services/x402Config.ts
function stellarNetworkId() {
  return process.env.STELLAR_NETWORK === "mainnet" || process.env.STELLAR_NETWORK === "pubnet" ? "stellar:pubnet" : "stellar:testnet";
}
function getX402Prices() {
  return {
    bridgeQuote: process.env.NIRIUM_X402_BRIDGE_PRICE ?? "0.25",
    fx: process.env.NIRIUM_X402_FX_PRICE ?? "0.10",
    quote: process.env.NIRIUM_X402_QUOTE_PRICE ?? "0.10",
    route: process.env.NIRIUM_X402_ROUTE_PRICE ?? "0.25",
    alert: process.env.NIRIUM_X402_ALERT_PRICE ?? "0.10"
  };
}
function isX402Enabled() {
  return process.env.NIRIUM_X402_ENABLED === "true";
}
function getX402Status() {
  const prices = getX402Prices();
  const network = stellarNetworkId();
  const payTo = process.env.STELLAR_PAY_TO?.trim() || null;
  return {
    enabled: isX402Enabled(),
    network,
    payTo,
    routes: {
      "GET /premium/bridge-quote": `$${prices.bridgeQuote}`,
      "GET /premium/fx": `$${prices.fx}`,
      "GET /v1/quote": `$${prices.quote}`,
      "GET /v1/route": `$${prices.route}`,
      "POST /v1/alert": `$${prices.alert}`
    }
  };
}
function getX402ServeBase() {
  const payTo = process.env.STELLAR_PAY_TO?.trim();
  const facilitatorApiKey = process.env.X402_FACILITATOR_API_KEY?.trim();
  const network = stellarNetworkId();
  if (!payTo || !facilitatorApiKey) {
    throw new Error(
      "NIRIUM x402 requires STELLAR_PAY_TO and X402_FACILITATOR_API_KEY"
    );
  }
  if (network === "stellar:pubnet") {
    console.log(
      "[TIA] x402 pubnet: STELLAR_PAY_TO must be mainnet G\u2026 with USDC trustline; facilitator from channels.openzeppelin.com/gen"
    );
  }
  const facilitatorUrl = process.env.X402_FACILITATOR_URL?.trim();
  return {
    payTo,
    facilitatorApiKey,
    ...facilitatorUrl ? { facilitatorUrl } : {},
    network,
    appName: "TIA Premium API"
  };
}
function getX402ServeConfig() {
  const prices = getX402Prices();
  return {
    ...getX402ServeBase(),
    routes: {
      "GET /bridge-quote": {
        price: `$${prices.bridgeQuote}`,
        description: "LI.FI cross-chain USDC quote (EVM \u2192 Solana)"
      },
      "GET /fx": {
        price: `$${prices.fx}`,
        description: "USD/MXN live rate (Bitso ticker)"
      }
    }
  };
}
function getX402V1ServeConfig() {
  const prices = getX402Prices();
  return {
    ...getX402ServeBase(),
    routes: {
      "GET /quote": {
        price: `$${prices.quote}`,
        description: "USD/MXN + spread + volumen 24h (Bitso)"
      },
      "GET /route": {
        price: `$${prices.route}`,
        description: "Mejor ruta USD\u2192MXN: Bitso / stablecoin / SPEI"
      },
      "POST /alert": {
        price: `$${prices.alert}`,
        description: "Alerta de umbral USD/MXN con webhook"
      }
    }
  };
}

// src/app.ts
function resolveX402Serve() {
  const bag = niriumNs;
  const nested = bag.default && typeof bag.default === "object" ? bag.default : void 0;
  const fn = [bag.x402Serve, nested?.x402Serve].find(
    (candidate) => typeof candidate === "function"
  );
  if (typeof fn !== "function") {
    throw new Error("nirium x402Serve export not found");
  }
  return fn;
}
function createApp() {
  const app = (0, import_express4.default)();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-PAYMENT, Payment-Signature"
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  app.options("*", (_req, res) => res.sendStatus(204));
  const rlWindowMs = envInt("RATE_LIMIT_WINDOW_SECONDS", 60) * 1e3;
  app.use(
    ["/premium", "/v1"],
    rateLimit({
      max: envInt("RATE_LIMIT_MAX", 30),
      windowMs: rlWindowMs,
      keyPrefix: "paid"
    })
  );
  app.use(
    ["/api/tia", "/api/lidia"],
    rateLimit({
      max: envInt("RATE_LIMIT_NOTIFY_MAX", 60),
      windowMs: rlWindowMs,
      keyPrefix: "notify"
    })
  );
  app.use(["/api/tia", "/api/lidia"], import_express4.default.json({ limit: "12mb" }));
  app.use(import_express4.default.json({ limit: "100kb" }));
  app.get("/health", async (_req, res) => {
    const prova = await getProvaStatus();
    const x402 = getX402Status();
    res.json({
      ok: true,
      agent: "TIA",
      service: "remesa-tia-backend",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      prova,
      x402
    });
  });
  const premiumEndpoints = isX402Enabled() ? `<li><code>GET /premium/bridge-quote</code> (x402)</li>
<li><code>GET /premium/fx</code> (x402)</li>
<li><code>GET /v1/quote</code> (x402)</li>
<li><code>GET /v1/route?amount=USD</code> (x402)</li>
<li><code>POST /v1/alert</code> (x402)</li>
<li><code>POST /v1/alert/check</code> (Bearer cron)</li>` : "";
  app.get("/", (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><title>holatia.app \u2014 TIA Backend</title></head>
<body style="font-family:system-ui;background:#0b0d12;color:#e7e9ee;padding:2rem">
<h1>Remesa <span style="color:#5eebc4">TIA</span> Backend</h1>
<p>Agente de notificaciones \u2014 <a href="https://holatia.app" style="color:#5eebc4">holatia.app</a></p>
<ul>
<li><code>GET /health</code></li>
<li><code>POST /api/tia/notify</code></li>
<li><code>POST /api/tia/manual-notify</code> (override, Bearer secret)</li>
<li><code>POST /api/lidia/notify</code> (alias legacy)</li>
${premiumEndpoints}
</ul>
</body></html>`);
  });
  if (isX402Enabled()) {
    try {
      const x402Serve = resolveX402Serve();
      const x402Config = getX402ServeConfig();
      if (!hasDurableKv() && (process.env.NODE_ENV === "production" || process.env.VERCEL)) {
        console.error(
          "[TIA] x402 SIN store durable: el replay guard rechazar\xE1 requests pagados (503) hasta configurar UPSTASH_REDIS_REST_URL/TOKEN"
        );
      }
      app.use(["/premium", "/v1"], paymentHeaderLimits(), paymentReplayGuard());
      app.use("/premium", publicOrigin(), x402Serve(x402Config));
      app.use("/premium", premium_default);
      const v1Config = getX402V1ServeConfig();
      app.use("/v1", publicOrigin(), x402Serve(v1Config));
      app.use("/v1", v1_default);
      console.log(
        `[TIA] x402 premium API enabled (${x402Config.network}) \u2192 ${[
          ...Object.keys(x402Config.routes).map((r) => `/premium ${r}`),
          ...Object.keys(v1Config.routes).map((r) => `/v1 ${r}`)
        ].join(", ")}`
      );
    } catch (err) {
      console.error("[TIA] x402 setup failed:", err);
    }
  }
  app.use("/api/tia", tia_default);
  app.use("/api/lidia", tia_default);
  app.use(
    (err, _req, res, _next) => {
      console.error("[TIA] unhandled:", err.stack ?? err.message ?? String(err));
      const status = typeof err.status === "number" && err.status >= 400 && err.status < 500 ? err.status : 500;
      res.status(status).json({
        ok: false,
        agent: "TIA",
        error: status === 500 ? "Internal error" : err.message
      });
    }
  );
  return app;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createApp
});
