type PatientProfileMeta = {
  location?: string;
  gender?: string;
  date_of_birth?: string;
};

const PATIENT_META_PREFIX = "__MEDICONNECT_PATIENT_META__";

export function serializePatientAddress(
  address: string,
  meta: PatientProfileMeta
) {
  return `${address.trim()}\n${PATIENT_META_PREFIX}${JSON.stringify(meta)}`.trim();
}

export function parsePatientAddress(value: string | null | undefined) {
  if (!value) {
    return {
      address: "",
      location: "",
      gender: "",
      date_of_birth: "",
    };
  }

  const index = value.indexOf(PATIENT_META_PREFIX);

  if (index === -1) {
    return {
      address: value,
      location: "",
      gender: "",
      date_of_birth: "",
    };
  }

  const address = value.slice(0, index).trim();
  const rawMeta = value.slice(index + PATIENT_META_PREFIX.length).trim();

  try {
    const parsed = JSON.parse(rawMeta) as PatientProfileMeta;
    return {
      address,
      location: parsed.location ?? "",
      gender: parsed.gender ?? "",
      date_of_birth: parsed.date_of_birth ?? "",
    };
  } catch {
    return {
      address,
      location: "",
      gender: "",
      date_of_birth: "",
    };
  }
}
