(function () {
  const steps = [
    "About Your Organization",
    "Where Do You Teach?",
    "What Do You Teach?",
    "Tell Firefighters About Your Training",
    "Contact & Links",
    "Images",
    "Preview & Submit"
  ];

  const states = [
    "Nationwide",
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming"
  ];

  const defaultValues = {
    listingType: "organization",
    organizationName: "",
    instructorName: "",
    primaryContactName: "",
    managementEmail: "",
    publicEmail: "",
    publicPhone: "",
    serviceAreaSummary: "",
    statesServed: [],
    specialtyIds: [],
    appSummary: "",
    publicProfile: "",
    websiteUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    linkedinUrl: "",
    youtubeUrl: ""
  };

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function isNA(value) {
    return clean(value).toUpperCase() === "N/A";
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value));
  }

  function isHttpsUrlOrNA(value) {
    if (isNA(value)) return true;
    try {
      const url = new URL(clean(value));
      return url.protocol === "https:";
    } catch (error) {
      return false;
    }
  }

  function getPublicTitle(values) {
    return values.listingType === "individual"
      ? clean(values.instructorName)
      : clean(values.organizationName);
  }

  function createField(label, name, value, options = {}) {
    const type = options.type || "text";
    const helper = options.helper ? `<span class="training-submit-field-helper">${escapeHtml(options.helper)}</span>` : "";
    const maxLength = options.maxLength ? ` maxlength="${options.maxLength}"` : "";
    const input = options.multiline
      ? `<textarea data-training-submit-field="${name}" rows="${options.rows || 5}"${maxLength}>${escapeHtml(value)}</textarea>`
      : `<input data-training-submit-field="${name}" type="${type}" value="${escapeHtml(value)}"${maxLength} />`;

    return `
      <label class="training-submit-field">
        <span>${escapeHtml(label)}</span>
        ${input}
        ${helper}
      </label>
    `;
  }

  function createChoice(label, checked, attrs) {
    return `
      <label class="training-submit-choice">
        <input ${attrs} ${checked ? "checked" : ""} />
        <span>${escapeHtml(label)}</span>
      </label>
    `;
  }

  function createErrorList(errors) {
    if (!errors.length) return "";
    return `
      <div class="training-submit-errors" role="alert">
        ${errors.map(error => `<p>${escapeHtml(error)}</p>`).join("")}
      </div>
    `;
  }

  function validateImage(file, label) {
    if (!file) return `${label} image is required.`;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return `${label} must be JPG, PNG, or WEBP.`;
    }
    return "";
  }

  function validateStep(stepIndex, values, files) {
    const errors = [];
    const requireText = (field, message) => {
      if (!clean(values[field])) errors.push(message);
    };

    if (stepIndex === 0) {
      if (!["organization", "individual"].includes(values.listingType)) {
        errors.push("Choose Organization or Individual Instructor.");
      }
      if (values.listingType === "organization") {
        requireText("organizationName", "Organization name is required.");
      }
      if (values.listingType === "individual") {
        requireText("instructorName", "Instructor name is required.");
      }
      requireText("primaryContactName", "Primary contact name is required.");
      requireText("managementEmail", "Management email is required.");
      if (values.managementEmail && !isEmail(values.managementEmail)) {
        errors.push("Management email must be a valid email address.");
      }
    }

    if (stepIndex === 1) {
      requireText("serviceAreaSummary", "Service area summary is required.");
      if (!values.statesServed.length) {
        errors.push("Select at least one state or Nationwide.");
      }
    }

    if (stepIndex === 2 && !values.specialtyIds.length) {
      errors.push("Select at least one specialty.");
    }

    if (stepIndex === 3) {
      requireText("appSummary", "App summary is required.");
      requireText("publicProfile", "Public profile is required.");
      if (values.appSummary.length > 300) {
        errors.push("App summary must be 300 characters or fewer.");
      }
      if (values.publicProfile.length > 5000) {
        errors.push("Public profile must be 5000 characters or fewer.");
      }
    }

    if (stepIndex === 4) {
      ["publicEmail", "publicPhone", "websiteUrl", "facebookUrl", "instagramUrl", "linkedinUrl", "youtubeUrl"].forEach(field => {
        requireText(field, `${field} is required. Enter N/A if it does not apply.`);
      });
      if (values.publicEmail && !isNA(values.publicEmail) && !isEmail(values.publicEmail)) {
        errors.push("Public email must be a valid email address or N/A.");
      }
      ["websiteUrl", "facebookUrl", "instagramUrl", "linkedinUrl", "youtubeUrl"].forEach(field => {
        if (values[field] && !isHttpsUrlOrNA(values[field])) {
          errors.push(`${field} must be an HTTPS URL or N/A.`);
        }
      });
    }

    if (stepIndex === 5) {
      const logoError = validateImage(files.logo, "Logo");
      const bannerError = validateImage(files.banner, "Banner");
      if (logoError) errors.push(logoError);
      if (bannerError) errors.push(bannerError);
    }

    return errors;
  }

  function validateAll(values, files) {
    return steps.flatMap((step, index) => validateStep(index, values, files));
  }

  function renderProgress(currentStep) {
    const percent = Math.round(((currentStep + 1) / steps.length) * 100);
    return `
      <div class="training-submit-progress">
        <div>
          <strong>Step ${currentStep + 1} of ${steps.length}</strong>
          <span>${escapeHtml(steps[currentStep])}</span>
        </div>
        <div class="training-submit-progress-bar" aria-hidden="true">
          <span style="width: ${percent}%"></span>
        </div>
      </div>
    `;
  }

  function renderStepOne(values) {
    return `
      <div class="training-submit-choice-grid">
        ${createChoice("Organization", values.listingType === "organization", 'type="radio" name="listingType" value="organization" data-training-submit-field="listingType"')}
        ${createChoice("Individual Instructor", values.listingType === "individual", 'type="radio" name="listingType" value="individual" data-training-submit-field="listingType"')}
      </div>
      ${values.listingType === "individual"
        ? createField("Instructor Name", "instructorName", values.instructorName)
        : createField("Organization Name", "organizationName", values.organizationName)}
      ${createField("Primary Contact Name", "primaryContactName", values.primaryContactName)}
      ${createField("Management Email", "managementEmail", values.managementEmail, { type: "email", helper: "Used for review communication. This is not the public listing email." })}
    `;
  }

  function renderStepTwo(values) {
    return `
      ${createField("Service Area Summary", "serviceAreaSummary", values.serviceAreaSummary, { helper: "Examples: Nationwide, Southeast United States, Georgia and Alabama." })}
      <div class="training-submit-check-section">
        <span>States Served</span>
        <div class="training-submit-choice-grid training-submit-state-grid">
          ${states.map(state => createChoice(
            state,
            values.statesServed.includes(state),
            `type="checkbox" value="${escapeHtml(state)}" data-training-submit-state`
          )).join("")}
        </div>
      </div>
    `;
  }

  function renderStepThree(values, specialties) {
    return `
      <div class="training-submit-check-section">
        <span>Training Specialties</span>
        <div class="training-submit-choice-grid">
          ${specialties.map(specialty => createChoice(
            specialty.displayName,
            values.specialtyIds.includes(specialty.id),
            `type="checkbox" value="${escapeHtml(specialty.id)}" data-training-submit-specialty`
          )).join("")}
        </div>
      </div>
    `;
  }

  function renderStepFour(values) {
    return `
      ${createField("App Summary", "appSummary", values.appSummary, {
        multiline: true,
        rows: 3,
        maxLength: 300,
        helper: `${values.appSummary.length}/300 characters. This compact summary will appear in the app after approval.`
      })}
      ${createField("Public Profile", "publicProfile", values.publicProfile, {
        multiline: true,
        rows: 8,
        maxLength: 5000,
        helper: `${values.publicProfile.length}/5000 characters. This longer profile is for the future public listing page.`
      })}
    `;
  }

  function renderStepFive(values) {
    return `
      ${createField("Public Email", "publicEmail", values.publicEmail, { type: "email", helper: "Enter N/A if this should not appear publicly." })}
      ${createField("Public Phone", "publicPhone", values.publicPhone, { type: "tel", helper: "Enter N/A if this should not appear publicly." })}
      ${createField("Website", "websiteUrl", values.websiteUrl, { type: "url", helper: "Use an HTTPS URL or N/A." })}
      ${createField("Facebook", "facebookUrl", values.facebookUrl, { type: "url", helper: "Use an HTTPS URL or N/A." })}
      ${createField("Instagram", "instagramUrl", values.instagramUrl, { type: "url", helper: "Use an HTTPS URL or N/A." })}
      ${createField("LinkedIn", "linkedinUrl", values.linkedinUrl, { type: "url", helper: "Use an HTTPS URL or N/A." })}
      ${createField("YouTube", "youtubeUrl", values.youtubeUrl, { type: "url", helper: "Use an HTTPS URL or N/A." })}
    `;
  }

  function renderImageInput(label, key, files, previews) {
    return `
      <label class="training-submit-field training-submit-file-field">
        <span>${escapeHtml(label)}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" data-training-submit-file="${key}" />
        <span class="training-submit-field-helper">Required. JPG, PNG, or WEBP.</span>
        ${previews[key]
          ? `<img class="training-submit-image-preview" src="${escapeHtml(previews[key])}" alt="${escapeHtml(label)} preview" />`
          : `<span class="training-submit-image-empty">No ${escapeHtml(label.toLowerCase())} selected.</span>`}
        ${files[key] ? `<span class="training-submit-field-helper">${escapeHtml(files[key].name)}</span>` : ""}
      </label>
    `;
  }

  function renderStepSix(files, previews) {
    return `
      <div class="training-submit-image-grid">
        ${renderImageInput("Logo", "logo", files, previews)}
        ${renderImageInput("Banner", "banner", files, previews)}
      </div>
    `;
  }

  function renderPreview(values, files, specialties) {
    const selectedSpecialties = specialties
      .filter(specialty => values.specialtyIds.includes(specialty.id))
      .map(specialty => specialty.displayName);
    return `
      <div class="training-submit-preview">
        <article class="hose-library-card reference-card reference-directory-card">
          <div>
            <strong>${escapeHtml(getPublicTitle(values) || "Listing Title")}</strong>
            <p class="helper">${escapeHtml(values.serviceAreaSummary || "Service area summary")}</p>
            <p class="helper">${escapeHtml(values.statesServed.join(", ") || "States served")}</p>
            <p class="helper">${escapeHtml(values.appSummary || "App summary")}</p>
            <div class="reference-topic-tags" aria-label="Selected specialties">
              ${selectedSpecialties.map(name => `<span>${escapeHtml(name)}</span>`).join("")}
            </div>
          </div>
        </article>
        <article class="hose-library-card reference-card reference-category-card reference-partner-detail-card">
          <strong>Public Profile</strong>
          <p class="helper">${escapeHtml(values.publicProfile || "Public profile")}</p>
        </article>
        <article class="hose-library-card reference-card reference-category-card reference-partner-detail-card">
          <strong>Submission Images</strong>
          <p class="helper">${escapeHtml(files.logo ? files.logo.name : "Logo required")}</p>
          <p class="helper">${escapeHtml(files.banner ? files.banner.name : "Banner required")}</p>
        </article>
      </div>
    `;
  }

  function buildPayload(values) {
    return {
      listingType: values.listingType,
      organizationName: values.listingType === "organization" ? clean(values.organizationName) : "N/A",
      instructorName: values.listingType === "individual" ? clean(values.instructorName) : "N/A",
      primaryContactName: clean(values.primaryContactName),
      managementEmail: clean(values.managementEmail),
      publicEmail: clean(values.publicEmail),
      publicPhone: clean(values.publicPhone),
      serviceAreaSummary: clean(values.serviceAreaSummary),
      statesServed: values.statesServed,
      specialtyIds: values.specialtyIds,
      appSummary: clean(values.appSummary),
      publicProfile: clean(values.publicProfile),
      websiteUrl: clean(values.websiteUrl),
      facebookUrl: clean(values.facebookUrl),
      instagramUrl: clean(values.instagramUrl),
      linkedinUrl: clean(values.linkedinUrl),
      youtubeUrl: clean(values.youtubeUrl)
    };
  }

  function renderSubmissionForm(container) {
    const service = window.ReverseFlowTrainingDirectorySubmissions;
    let currentStep = 0;
    let values = { ...defaultValues };
    let files = { logo: null, banner: null };
    let previews = { logo: "", banner: "" };
    let specialties = service ? service.fallbackSpecialties : [];
    let errors = [];
    let isSubmitting = false;
    let success = null;

    function paint() {
      if (success) {
        container.innerHTML = `
          <div class="references-group">
            <a class="reset-button reference-open-button reference-back-link" href="references.html?section=training-partners">
              Back to Training Directory
            </a>
            <h2>Submission Received</h2>
            <p class="helper">Every Training Directory listing is reviewed before publication.</p>
          </div>
          <article class="hose-library-card reference-card reference-empty-card training-submit-success">
            <div>
              <strong>Thank you. Your listing has been submitted for review.</strong>
              <p class="helper">Submission ID: ${escapeHtml(success.submissionId || "Pending")}</p>
              <p class="helper">Reverse Flow will review the listing before anything is published.</p>
            </div>
            <a class="reset-button reference-open-button" href="references.html?section=training-partners">Back to Directory</a>
          </article>
        `;
        return;
      }

      const stepBody = [
        renderStepOne(values),
        renderStepTwo(values),
        renderStepThree(values, specialties),
        renderStepFour(values),
        renderStepFive(values),
        renderStepSix(files, previews),
        renderPreview(values, files, specialties)
      ][currentStep];

      container.innerHTML = `
        <div class="references-group">
          <a class="reset-button reference-open-button reference-back-link" href="references.html?section=training-partners">
            Back to Training Directory
          </a>
          <h2>Join the Reverse Flow Training Directory</h2>
          <p class="helper">Submit a fire service training listing for editorial review.</p>
        </div>
        <form class="hose-library-card reference-card training-submit-form" data-training-submit-form novalidate>
          ${renderProgress(currentStep)}
          ${createErrorList(errors)}
          <div class="training-submit-step">
            <h3>${escapeHtml(steps[currentStep])}</h3>
            ${stepBody}
          </div>
          <div class="training-submit-actions">
            <button class="reset-button reference-open-button" type="button" data-training-submit-back ${currentStep === 0 || isSubmitting ? "disabled" : ""}>Back</button>
            ${currentStep < steps.length - 1
              ? `<button class="reset-button reference-open-button reference-primary-action" type="button" data-training-submit-next ${isSubmitting ? "disabled" : ""}>Next</button>`
              : `<button class="reset-button reference-open-button reference-primary-action" type="submit" ${isSubmitting ? "disabled" : ""}>${isSubmitting ? "Submitting..." : "Submit for Review"}</button>`}
          </div>
        </form>
      `;
    }

    function updateField(target) {
      const field = target.dataset.trainingSubmitField;
      if (!field) return;

      if (target.type === "radio") {
        if (target.checked) values[field] = target.value;
        return;
      }

      values[field] = target.value;
    }

    function updateStateSelection(target) {
      const state = target.value;
      if (state === "Nationwide" && target.checked) {
        values.statesServed = ["Nationwide"];
        return;
      }
      values.statesServed = values.statesServed.filter(item => item !== "Nationwide");
      if (target.checked) {
        values.statesServed = [...new Set([...values.statesServed, state])];
      } else {
        values.statesServed = values.statesServed.filter(item => item !== state);
      }
    }

    function updateSpecialtySelection(target) {
      const specialtyId = target.value;
      if (target.checked) {
        values.specialtyIds = [...new Set([...values.specialtyIds, specialtyId])];
      } else {
        values.specialtyIds = values.specialtyIds.filter(id => id !== specialtyId);
      }
    }

    function updateFile(target) {
      const key = target.dataset.trainingSubmitFile;
      const file = target.files && target.files[0] ? target.files[0] : null;
      if (!key || !file) return;
      if (previews[key]) {
        URL.revokeObjectURL(previews[key]);
      }
      files[key] = file;
      previews[key] = URL.createObjectURL(file);
    }

    container.addEventListener("input", event => {
      updateField(event.target);
    });

    container.addEventListener("change", event => {
      const target = event.target;
      updateField(target);
      if (target.matches("[data-training-submit-state]")) {
        updateStateSelection(target);
      }
      if (target.matches("[data-training-submit-specialty]")) {
        updateSpecialtySelection(target);
      }
      if (target.matches("[data-training-submit-file]")) {
        updateFile(target);
      }
      errors = [];
      paint();
    });

    container.addEventListener("click", event => {
      const backButton = event.target.closest("[data-training-submit-back]");
      const nextButton = event.target.closest("[data-training-submit-next]");
      if (backButton) {
        currentStep = Math.max(0, currentStep - 1);
        errors = [];
        paint();
      }
      if (nextButton) {
        errors = validateStep(currentStep, values, files);
        if (!errors.length) {
          currentStep = Math.min(steps.length - 1, currentStep + 1);
        }
        paint();
      }
    });

    container.addEventListener("submit", async event => {
      if (!event.target.matches("[data-training-submit-form]")) return;
      event.preventDefault();
      errors = validateAll(values, files);
      if (errors.length) {
        currentStep = Math.max(0, steps.findIndex((step, index) => validateStep(index, values, files).length));
        paint();
        return;
      }
      if (!service) {
        errors = ["Training Directory submission service is not available."];
        paint();
        return;
      }

      isSubmitting = true;
      paint();
      try {
        success = await service.submitListing(buildPayload(values), files);
        paint();
      } catch (error) {
        errors = [error.message || "The listing could not be submitted."];
        isSubmitting = false;
        paint();
      }
    });

    paint();

    if (service) {
      service.getSpecialties().then(items => {
        specialties = items;
        if (!success) paint();
      });
    }
  }

  window.renderTrainingDirectorySubmissionForm = renderSubmissionForm;
})();
