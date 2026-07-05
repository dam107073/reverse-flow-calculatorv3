(function () {
  const fallbackSpecialties = [
    { id: "fire-attack-package-design", slug: "fire-attack-package-design", displayName: "Fire Attack Package Design" },
    { id: "engine-company-operations", slug: "engine-company-operations", displayName: "Engine Company Operations" },
    { id: "truck-company-operations", slug: "truck-company-operations", displayName: "Truck Company Operations" },
    { id: "standpipe-operations", slug: "standpipe-operations", displayName: "Standpipe Operations" },
    { id: "pump-operations", slug: "pump-operations", displayName: "Pump Operations" },
    { id: "water-supply", slug: "water-supply", displayName: "Water Supply" },
    { id: "rural-water-supply", slug: "rural-water-supply", displayName: "Rural Water Supply" },
    { id: "apparatus-specifications", slug: "apparatus-specifications", displayName: "Apparatus Specifications" },
    { id: "hose-nozzle-selection", slug: "hose-nozzle-selection", displayName: "Hose & Nozzle Selection" },
    { id: "officer-development", slug: "officer-development", displayName: "Officer Development" },
    { id: "leadership", slug: "leadership", displayName: "Leadership" },
    { id: "fire-behavior", slug: "fire-behavior", displayName: "Fire Behavior" },
    { id: "tactical-decision-making", slug: "tactical-decision-making", displayName: "Tactical Decision Making" },
    { id: "search-rescue", slug: "search-rescue", displayName: "Search & Rescue" },
    { id: "ventilation", slug: "ventilation", displayName: "Ventilation" },
    { id: "wildland", slug: "wildland", displayName: "Wildland" },
    { id: "industrial-firefighting", slug: "industrial-firefighting", displayName: "Industrial Firefighting" },
    { id: "airport-firefighting", slug: "airport-firefighting", displayName: "Airport Firefighting" },
    { id: "instructor-development", slug: "instructor-development", displayName: "Instructor Development" },
    { id: "driver-operator", slug: "driver-operator", displayName: "Driver/Operator" },
    { id: "incident-command", slug: "incident-command", displayName: "Incident Command" }
  ];

  let specialtyCache = null;

  function getConfig() {
    return window.REVERSE_FLOW_TRAINING_DIRECTORY_CONFIG || {};
  }

  function normalizeSpecialty(row) {
    return {
      id: row.id || row.slug,
      slug: row.slug || row.id,
      displayName: row.displayName || row.display_name || row.name || row.slug || row.id
    };
  }

  async function getSpecialties() {
    if (specialtyCache) {
      return specialtyCache;
    }

    const config = getConfig();
    const endpoint = config.specialtiesEndpoint || "/api/training-directory/specialties";

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) {
        throw new Error(`Specialty request failed with ${response.status}`);
      }
      const body = await response.json();
      const specialties = Array.isArray(body.specialties)
        ? body.specialties.map(normalizeSpecialty).filter(item => item.id && item.displayName)
        : [];
      specialtyCache = specialties.length ? specialties : fallbackSpecialties;
    } catch (error) {
      console.warn("Training Directory specialties fell back to the local controlled list.", error);
      specialtyCache = fallbackSpecialties;
    }

    return specialtyCache;
  }

  async function submitListing(payload, files) {
    const config = getConfig();
    const endpoint = config.submissionEndpoint || "/api/training-directory/submit";
    const formData = new FormData();
    formData.append("payload", JSON.stringify(payload));
    formData.append("logo", files.logo);
    formData.append("banner", files.banner);

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || "The listing could not be submitted. Please review the form and try again.");
    }

    return body;
  }

  window.ReverseFlowTrainingDirectorySubmissions = {
    fallbackSpecialties,
    getSpecialties,
    submitListing
  };
})();
