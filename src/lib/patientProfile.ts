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

export type PatientRow = {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone: string;
  address: string;
};

/** Public patient shape returned by the API. Never includes the password. */
export function shapePatient(row: PatientRow) {
  const profile = parsePatientAddress(row.address);
  const nameParts = (row.name ?? "").split(" ");

  return {
    id: row.id,
    name: row.name,
    first_name: nameParts[0] ?? "",
    last_name: nameParts.slice(1).join(" "),
    email: row.email,
    phone: row.phone,
    address: profile.address,
    location: profile.location,
    gender: profile.gender,
    date_of_birth: profile.date_of_birth,
  };
}
