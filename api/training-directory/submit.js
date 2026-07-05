export const config = {
  runtime: "edge"
};

const acceptedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

const maxImageBytes = 6 * 1024 * 1024;

function getEnv(name) {
  if (typeof Deno !== "undefined" && Deno.env) {
    return Deno.env.get(name);
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env[name];
  }
  return "";
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function cleanText(value) {
  return String(value || "").trim();
}

function isNonEmpty(value) {
  return cleanText(value).length > 0;
}

function isNA(value) {
  return cleanText(value).toUpperCase() === "N/A";
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(value));
}

function isHttpsUrlOrNA(value) {
  if (isNA(value)) return true;
  try {
    const url = new URL(cleanText(value));
    return url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getPublicTitle(payload) {
  return payload.listingType === "individual"
    ? cleanText(payload.instructorName)
    : cleanText(payload.organizationName);
}

function validatePayload(payload, activeSpecialtyKeys) {
  const errors = [];
  const requiredTextFields = [
    ["listingType", "Listing type is required."],
    ["primaryContactName", "Primary contact name is required."],
    ["managementEmail", "Management email is required."],
    ["publicEmail", "Public email is required. Enter N/A if it does not apply."],
    ["publicPhone", "Public phone is required. Enter N/A if it does not apply."],
    ["serviceAreaSummary", "Service area summary is required."],
    ["appSummary", "App summary is required."],
    ["publicProfile", "Public profile is required."],
    ["websiteUrl", "Website URL is required. Enter N/A if it does not apply."],
    ["facebookUrl", "Facebook URL is required. Enter N/A if it does not apply."],
    ["instagramUrl", "Instagram URL is required. Enter N/A if it does not apply."],
    ["linkedinUrl", "LinkedIn URL is required. Enter N/A if it does not apply."],
    ["youtubeUrl", "YouTube URL is required. Enter N/A if it does not apply."]
  ];

  requiredTextFields.forEach(([field, message]) => {
    if (!isNonEmpty(payload[field])) errors.push(message);
  });

  if (!["organization", "individual"].includes(payload.listingType)) {
    errors.push("Listing type must be organization or individual.");
  }
  if (payload.listingType === "organization" && !isNonEmpty(payload.organizationName)) {
    errors.push("Organization name is required.");
  }
  if (payload.listingType === "individual" && !isNonEmpty(payload.instructorName)) {
    errors.push("Instructor name is required.");
  }
  if (!isEmail(payload.managementEmail)) {
    errors.push("Management email must be a valid email address.");
  }
  if (!isNA(payload.publicEmail) && !isEmail(payload.publicEmail)) {
    errors.push("Public email must be a valid email address or N/A.");
  }
  ["websiteUrl", "facebookUrl", "instagramUrl", "linkedinUrl", "youtubeUrl"].forEach(field => {
    if (!isHttpsUrlOrNA(payload[field])) {
      errors.push(`${field} must be an HTTPS URL or N/A.`);
    }
  });
  if (cleanText(payload.appSummary).length > 300) {
    errors.push("App summary must be 300 characters or fewer.");
  }
  if (cleanText(payload.publicProfile).length > 5000) {
    errors.push("Public profile must be 5000 characters or fewer.");
  }
  if (!Array.isArray(payload.statesServed) || payload.statesServed.length === 0) {
    errors.push("Select at least one state or Nationwide.");
  }
  if (!Array.isArray(payload.specialtyIds) || payload.specialtyIds.length === 0) {
    errors.push("Select at least one specialty.");
  } else {
    const unknownSpecialty = payload.specialtyIds.find(id => !activeSpecialtyKeys.has(id));
    if (unknownSpecialty) {
      errors.push("Selected specialties must come from the controlled Training Directory list.");
    }
  }

  return errors;
}

function validateImage(file, label) {
  if (!(file instanceof File)) {
    return `${label} image is required.`;
  }
  if (!acceptedImageTypes.has(file.type)) {
    return `${label} must be a JPG, PNG, or WEBP image.`;
  }
  if (file.size > maxImageBytes) {
    return `${label} must be 6 MB or smaller.`;
  }
  return "";
}

async function loadActiveSpecialties(supabaseUrl, serviceRoleKey) {
  const query = "select=id,slug,display_name&is_active=eq.true";
  const response = await fetch(`${supabaseUrl}/rest/v1/training_listing_specialties?${query}`, {
    headers: {
      "apikey": serviceRoleKey,
      "authorization": `Bearer ${serviceRoleKey}`,
      "accept": "application/json"
    }
  });
  if (!response.ok) {
    throw new Error("Unable to load active specialties.");
  }
  return response.json();
}

async function uploadSubmissionImage(supabaseUrl, serviceRoleKey, bucket, path, file) {
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      "apikey": serviceRoleKey,
      "authorization": `Bearer ${serviceRoleKey}`,
      "content-type": file.type,
      "x-upsert": "false"
    },
    body: file
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to upload submission image.");
  }
}

async function insertSubmission(supabaseUrl, serviceRoleKey, row) {
  const response = await fetch(`${supabaseUrl}/rest/v1/training_listing_submissions?select=id,status,submitted_at`, {
    method: "POST",
    headers: {
      "apikey": serviceRoleKey,
      "authorization": `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      "accept": "application/json",
      "prefer": "return=representation"
    },
    body: JSON.stringify(row)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to save listing submission.");
  }

  const rows = await response.json();
  return rows[0];
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Training Directory backend is not configured." }, 500);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (error) {
    return jsonResponse({ error: "Submission must be sent as multipart form data." }, 400);
  }

  let payload;
  try {
    payload = JSON.parse(String(formData.get("payload") || "{}"));
  } catch (error) {
    return jsonResponse({ error: "Submission payload is invalid." }, 400);
  }

  const logo = formData.get("logo");
  const banner = formData.get("banner");
  let specialtyRows;
  try {
    specialtyRows = await loadActiveSpecialties(supabaseUrl, serviceRoleKey);
  } catch (error) {
    console.error("Training Directory specialty validation failed.", error);
    return jsonResponse({ error: "Unable to validate Training Directory specialties." }, 502);
  }
  const specialtyByKey = new Map();
  specialtyRows.forEach(row => {
    specialtyByKey.set(row.id, row);
    specialtyByKey.set(row.slug, row);
  });
  const activeSpecialtyKeys = new Set(specialtyByKey.keys());
  const errors = [
    ...validatePayload(payload, activeSpecialtyKeys),
    validateImage(logo, "Logo"),
    validateImage(banner, "Banner")
  ].filter(Boolean);

  if (errors.length) {
    return jsonResponse({ error: errors[0], errors }, 400);
  }

  const submissionId = crypto.randomUUID();
  const publicTitle = getPublicTitle(payload);
  const logoPath = `submissions/${submissionId}/logo.${acceptedImageTypes.get(logo.type)}`;
  const bannerPath = `submissions/${submissionId}/banner.${acceptedImageTypes.get(banner.type)}`;
  const selectedSpecialtyRows = payload.specialtyIds.map(id => specialtyByKey.get(id)).filter(Boolean);
  const listingPayload = {
    listing_type: payload.listingType,
    public_title: publicTitle,
    organization_name: payload.listingType === "organization" ? cleanText(payload.organizationName) : "N/A",
    instructor_name: payload.listingType === "individual" ? cleanText(payload.instructorName) : "N/A",
    primary_contact_name: cleanText(payload.primaryContactName),
    management_email: cleanText(payload.managementEmail),
    public_email: cleanText(payload.publicEmail),
    public_phone: cleanText(payload.publicPhone),
    website_url: cleanText(payload.websiteUrl),
    facebook_url: cleanText(payload.facebookUrl),
    instagram_url: cleanText(payload.instagramUrl),
    linkedin_url: cleanText(payload.linkedinUrl),
    youtube_url: cleanText(payload.youtubeUrl),
    service_area_summary: cleanText(payload.serviceAreaSummary),
    states_served: payload.statesServed,
    specialty_ids: selectedSpecialtyRows.map(row => row.id),
    specialties: selectedSpecialtyRows.map(row => row.display_name),
    app_summary: cleanText(payload.appSummary),
    public_profile: cleanText(payload.publicProfile),
    logo_path: logoPath,
    banner_path: bannerPath
  };

  try {
    await uploadSubmissionImage(supabaseUrl, serviceRoleKey, "training-submissions", logoPath, logo);
    await uploadSubmissionImage(supabaseUrl, serviceRoleKey, "training-submissions", bannerPath, banner);
    const submission = await insertSubmission(supabaseUrl, serviceRoleKey, {
      id: submissionId,
      submission_type: "new_listing",
      status: "submitted",
      listing_id: null,
      requested_slug: slugify(publicTitle),
      listing_payload: listingPayload,
      submitter_name: cleanText(payload.primaryContactName),
      submitter_email: cleanText(payload.managementEmail),
      management_email: cleanText(payload.managementEmail)
    });

    return jsonResponse({
      submissionId: submission.id,
      status: submission.status,
      submittedAt: submission.submitted_at,
      logoPath,
      bannerPath
    }, 201);
  } catch (error) {
    console.error("Training Directory submission failed.", error);
    return jsonResponse({ error: "The listing could not be submitted. Please try again." }, 502);
  }
}
