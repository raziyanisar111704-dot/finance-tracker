// Controls how documents look when sent to the client:
// `id` instead of `_id`, no `__v`, and any listed private fields removed.
export function toJSONOptions(hiddenFields = []) {
  return {
    versionKey: false,
    transform(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      for (const field of hiddenFields) delete ret[field];
      return ret;
    },
  };
}
