const VERSION = "0.1.5";

class HaHomeCameraCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._manual = {};
    this._feedEntities = {};
    this._generation = 0;
  }

  static getStubConfig() {
    return {
      title: "Kameraer",
      navigation_path: "/lovelace/cameras",
      groups: [
        {
          name: "Forside",
          selector_entity: "sensor.active_front_camera",
          cameras: [{ key: "front_door", name: "Fordør", entity: "camera.front_door" }],
        },
      ],
    };
  }

  static getConfigElement() {
    return document.createElement("ha-home-camera-card-editor");
  }

  setConfig(config) {
    if (!Array.isArray(config?.groups) || !config.groups.length)
      throw new Error("Kamerakortet kræver mindst én kameragruppe");
    this.config = {
      title: "Kameraer lige nu",
      navigation_path: "/lovelace/cameras",
      aspect_ratio: "16:9",
      ...config,
    };
    this._generation += 1;
    this._feedEntities = {};
    this._renderShell();
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  getCardSize() {
    return 4;
  }

  _state(id) {
    return id ? this._hass?.states?.[id] : undefined;
  }

  _active(id) {
    return this._state(id)?.state === "on";
  }

  _selected(group, index) {
    const automatic = this._state(group.selector_entity)?.state;
    const requested = this._manual[index] || automatic;
    return group.cameras.find((camera) => camera.key === requested) || group.cameras[0];
  }

  _candidateIds(camera) {
    const prefix = camera.detection_prefix || camera.key;
    const defaults = {
      person: `binary_sensor.${prefix}_person_detected`,
      animal: `binary_sensor.${prefix}_animal_detected`,
      vehicle: `binary_sensor.${prefix}_vehicle_detected`,
      object: [
        `binary_sensor.${prefix}_object_detected`,
        `binary_sensor.${prefix}_audio_object_detected`,
        `binary_sensor.${prefix}_doorbell`,
        `binary_sensor.${prefix}_license_plate_detected`,
        `binary_sensor.${prefix}_speaking_detected`,
      ],
      motion: `binary_sensor.${prefix}_motion`,
    };
    const configured = camera.detections || {};
    return {
      person: configured.person || defaults.person,
      animal: configured.animal || defaults.animal,
      vehicle: configured.vehicle || defaults.vehicle,
      object: configured.object || defaults.object,
      motion: configured.motion || defaults.motion,
    };
  }

  _activity(camera) {
    const ids = this._candidateIds(camera);
    const any = (value) => (Array.isArray(value) ? value : [value]).some((id) => this._active(id));
    if (any(ids.person)) return { text: "Person", icon: "mdi:account", cls: "person" };
    if (any(ids.animal)) return { text: "Dyr", icon: "mdi:paw", cls: "animal" };
    if (any(ids.vehicle)) return { text: "Køretøj", icon: "mdi:car", cls: "vehicle" };
    if (any(ids.object)) return { text: "Hændelse", icon: "mdi:bell-ring", cls: "object" };
    if (any(ids.motion)) return { text: "Bevægelse", icon: "mdi:motion-sensor", cls: "motion" };
    return { text: "Roligt", icon: "mdi:shield-check-outline", cls: "quiet" };
  }

  _allWatched() {
    return (this.config?.groups || []).flatMap((group) => [
      group.selector_entity,
      ...(group.cameras || []).flatMap((camera) => {
        const ids = this._candidateIds(camera);
        return [camera.entity, ids.person, ids.animal, ids.vehicle, ids.motion, ...(Array.isArray(ids.object) ? ids.object : [ids.object])];
      }),
    ]).filter(Boolean);
  }

  _renderShell() {
    if (!this.shadowRoot || !this.config) return;
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;--surface:var(--surface,var(--ha-card-background,var(--card-background-color,#1c1f26)));--text:var(--gray800,var(--primary-text-color,#f8fafc));--muted:var(--gray600,var(--secondary-text-color,#94a3b8));--edge:var(--dashboard-border-neutral,var(--divider-color,rgba(148,163,184,.2)));--accent:var(--dashboard-accent,var(--primary-color,#62b5ff));--ok:var(--dashboard-success,var(--success-color,#54d9aa));--warn:var(--dashboard-warning,var(--warning-color,#ffbd59));--danger:var(--dashboard-danger,var(--error-color,#ff667a));--animal:var(--dashboard-orange,var(--warning-color,#f97316));--object:var(--dashboard-purple,var(--accent-color,#a855f7));--motion:var(--dashboard-cyan,var(--info-color,#06b6d4));color:var(--text)}
      *{box-sizing:border-box}ha-card{overflow:hidden;border:1px solid var(--edge);border-left:4px solid var(--accent);border-radius:18px;background:var(--surface);box-shadow:var(--state-card-shadow,var(--ha-card-box-shadow,0 12px 30px rgba(0,0,0,.18)))}
      header{display:none}.heading{display:flex;align-items:center;gap:10px;min-width:0}.heading ha-icon{color:var(--accent)}h2{margin:0;font-size:17px}.sub{margin-top:2px;color:var(--muted);font-size:11px}.all{display:flex;align-items:center;gap:5px;border:1px solid var(--edge);border-radius:999px;padding:7px 10px;background:transparent;color:var(--text);font:inherit;font-size:11px;font-weight:750;cursor:pointer}.all ha-icon{--mdc-icon-size:16px;color:var(--accent)}
      .grid{display:grid;grid-template-columns:repeat(var(--columns,3),minmax(0,1fr));gap:10px;padding:12px}.panel{min-width:0;overflow:hidden;border:1px solid var(--edge);border-radius:15px;background:color-mix(in srgb,var(--surface) 93%,var(--text) 7%)}.panel.person{border-color:color-mix(in srgb,var(--danger) 72%,transparent)}.panel.animal{border-color:color-mix(in srgb,var(--animal) 72%,transparent)}.panel.vehicle{border-color:color-mix(in srgb,var(--accent) 72%,transparent)}.panel.object{border-color:color-mix(in srgb,var(--object) 72%,transparent)}.panel.motion{border-color:color-mix(in srgb,var(--motion) 72%,transparent)}
      .bar{display:flex;align-items:center;gap:5px;padding:6px}.name{min-width:0;flex:1}.name b,.name span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.name b{font-size:11px}.name span{display:none;color:var(--muted);font-size:9px}.activity{display:flex;align-items:center;gap:4px;color:var(--ok);font-size:10px;font-weight:800}.activity span{display:none}.activity ha-icon{--mdc-icon-size:14px}.person .activity{color:var(--danger)}.animal .activity{color:var(--animal)}.vehicle .activity{color:var(--accent)}.object .activity{color:var(--object)}.motion .activity{color:var(--motion)}.choose{display:grid;width:29px;height:29px;place-items:center;border:1px solid var(--edge);border-radius:50%;padding:0;background:transparent;color:var(--text);cursor:pointer}.choose ha-icon{--mdc-icon-size:16px;color:var(--accent)}
      .feed{position:relative;overflow:hidden;aspect-ratio:16/9;background:var(--camera-feed-background,var(--ha-card-background,#05080d))}.feed>*{width:100%;height:100%;display:block}.chips{display:none}.chip{flex:0 0 auto;border:1px solid var(--edge);border-radius:999px;padding:5px 8px;background:transparent;color:var(--muted);font:inherit;font-size:9px;font-weight:750;cursor:pointer}.chip.active{border-color:color-mix(in srgb,var(--accent) 68%,transparent);background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--text)}
      .missing{display:grid!important;place-items:center;color:var(--muted);font-size:12px}.missing ha-icon{--mdc-icon-size:30px;margin-bottom:5px}.missing div{text-align:center}
      dialog{width:min(92vw,420px);max-height:78vh;margin:auto auto 0;border:1px solid var(--edge);border-radius:20px 20px 0 0;padding:0;background:var(--surface);color:var(--text);box-shadow:0 -14px 45px rgba(0,0,0,.32)}dialog::backdrop{background:rgba(0,0,0,.48);backdrop-filter:blur(2px)}.sheet-head{display:flex;align-items:center;justify-content:space-between;padding:15px 16px 10px;border-bottom:1px solid var(--edge)}.sheet-head b{font-size:15px}.close{display:grid;width:34px;height:34px;place-items:center;border:0;border-radius:50%;background:color-mix(in srgb,var(--surface) 85%,var(--text) 15%);color:var(--text);cursor:pointer}.close ha-icon{--mdc-icon-size:19px}.choices{display:grid;gap:7px;padding:12px 12px calc(14px + env(safe-area-inset-bottom))}.choice{display:flex;align-items:center;gap:11px;width:100%;min-height:48px;border:1px solid var(--edge);border-radius:13px;padding:9px 12px;background:transparent;color:var(--text);font:inherit;text-align:left;cursor:pointer}.choice ha-icon{--mdc-icon-size:20px;color:var(--muted)}.choice span{flex:1;font-size:13px;font-weight:700}.choice.active{border-color:color-mix(in srgb,var(--accent) 70%,transparent);background:color-mix(in srgb,var(--accent) 12%,transparent)}.choice.active ha-icon,.choice .check{color:var(--accent)}
      @media(max-width:900px){.grid{grid-template-columns:repeat(var(--columns,3),minmax(0,1fr))}.feed{aspect-ratio:16/9}}
      @media(max-width:600px){header{display:none}.grid{grid-template-columns:repeat(var(--columns,3),minmax(0,1fr));padding:7px;gap:5px}.chips{display:none}.choose{display:grid;width:27px;height:27px}.choose ha-icon{--mdc-icon-size:15px}.bar{padding:5px;gap:3px}.name b{font-size:10px}.name span,.activity span{display:none}.activity ha-icon{--mdc-icon-size:13px}.feed{aspect-ratio:16/9}}
    </style><ha-card><header><div class="heading"><ha-icon icon="mdi:cctv"></ha-icon><div><h2>${this._escape(this.config.title)}</h2><div class="sub">Automatisk valg med manuel overstyring</div></div></div><button class="all" data-nav><ha-icon icon="mdi:view-dashboard-outline"></ha-icon><span>Alle kameraer</span></button></header><div class="grid" style="--columns:${Math.min(3, this.config.groups.length)}">${this.config.groups.map((group, index) => `<section class="panel quiet" data-panel="${index}"><div class="bar"><div class="name"><b data-name></b><span>${this._escape(group.name || `Gruppe ${index + 1}`)}</span></div><div class="activity"><ha-icon data-activity-icon></ha-icon><span data-activity-text></span></div><button class="choose" data-choose="${index}" aria-label="Vælg kamera"><ha-icon icon="mdi:camera-switch-outline"></ha-icon></button></div><div class="feed" data-feed="${index}"></div><div class="chips"><button class="chip" data-auto="${index}">Auto</button>${(group.cameras || []).map((camera) => `<button class="chip" data-group="${index}" data-camera="${this._escape(camera.key)}">${this._escape(camera.name || camera.key)}</button>`).join("")}</div></section>`).join("")}</div></ha-card><dialog data-dialog><div class="sheet-head"><b data-dialog-title>Vælg kamera</b><button class="close" data-close aria-label="Luk"><ha-icon icon="mdi:close"></ha-icon></button></div><div class="choices" data-choices></div></dialog>`;
    this.shadowRoot.querySelector("[data-nav]")?.addEventListener("click", () => this._navigate(this.config.navigation_path));
    this.shadowRoot.querySelectorAll("[data-camera]").forEach((button) => button.addEventListener("click", () => {
      this._manual[Number(button.dataset.group)] = button.dataset.camera;
      this._update();
    }));
    this.shadowRoot.querySelectorAll("[data-auto]").forEach((button) => button.addEventListener("click", () => {
      delete this._manual[Number(button.dataset.auto)];
      this._update();
    }));
    this.shadowRoot.querySelectorAll("[data-choose]").forEach((button) => button.addEventListener("click", () => this._openPicker(Number(button.dataset.choose))));
    const dialog = this.shadowRoot.querySelector("[data-dialog]");
    this.shadowRoot.querySelector("[data-close]")?.addEventListener("click", () => dialog?.close());
    dialog?.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  }

  _openPicker(index) {
    const group = this.config.groups[index];
    const dialog = this.shadowRoot.querySelector("[data-dialog]");
    const choices = this.shadowRoot.querySelector("[data-choices]");
    if (!group || !dialog || !choices) return;
    this.shadowRoot.querySelector("[data-dialog-title]").textContent = group.name || "Vælg kamera";
    const automatic = !this._manual[index];
    choices.innerHTML = `<button class="choice ${automatic ? "active" : ""}" data-pick-auto><ha-icon icon="mdi:auto-fix"></ha-icon><span>Automatisk valg</span>${automatic ? '<ha-icon class="check" icon="mdi:check"></ha-icon>' : ""}</button>${group.cameras.map((camera) => { const active = this._manual[index] === camera.key; return `<button class="choice ${active ? "active" : ""}" data-pick-camera="${this._escape(camera.key)}"><ha-icon icon="mdi:cctv"></ha-icon><span>${this._escape(camera.name || camera.key)}</span>${active ? '<ha-icon class="check" icon="mdi:check"></ha-icon>' : ""}</button>`; }).join("")}`;
    choices.querySelector("[data-pick-auto]")?.addEventListener("click", () => { delete this._manual[index]; dialog.close(); this._update(); });
    choices.querySelectorAll("[data-pick-camera]").forEach((button) => button.addEventListener("click", () => { this._manual[index] = button.dataset.pickCamera; dialog.close(); this._update(); }));
    dialog.showModal();
  }

  _update() {
    if (!this._hass || !this.config || !this.shadowRoot.querySelector("ha-card")) return;
    this.config.groups.forEach((group, index) => {
      const camera = this._selected(group, index);
      if (!camera) return;
      const panel = this.shadowRoot.querySelector(`[data-panel="${index}"]`);
      const activity = this._activity(camera);
      panel.className = `panel ${activity.cls}`;
      panel.querySelector("[data-name]").textContent = camera.name || camera.key;
      panel.querySelector("[data-activity-icon]").setAttribute("icon", activity.icon);
      panel.querySelector("[data-activity-text]").textContent = activity.text;
      panel.querySelectorAll(".chip").forEach((chip) => {
        const active = chip.dataset.auto !== undefined ? !this._manual[index] : chip.dataset.camera === camera.key;
        chip.classList.toggle("active", active);
      });
      this._setFeed(index, camera);
    });
  }

  async _setFeed(index, camera) {
    if (this._feedEntities[index] === camera.entity) {
      const card = this.shadowRoot.querySelector(`[data-feed="${index}"]`)?.firstElementChild;
      if (card) card.hass = this._hass;
      return;
    }
    this._feedEntities[index] = camera.entity;
    const feed = this.shadowRoot.querySelector(`[data-feed="${index}"]`);
    if (!feed) return;
    const generation = this._generation;
    const state = this._state(camera.entity);
    if (!state) {
      feed.innerHTML = `<div class="missing"><div><ha-icon icon="mdi:camera-off-outline"></ha-icon><br>Kamera ikke fundet</div></div>`;
      return;
    }
    try {
      const helpers = await window.loadCardHelpers();
      if (generation !== this._generation || this._feedEntities[index] !== camera.entity) return;
      const card = await helpers.createCardElement({
        type: "picture-elements",
        camera_image: camera.entity,
        camera_view: "live",
        elements: [],
        aspect_ratio: this.config.aspect_ratio,
        fit_mode: "cover",
        tap_action: { action: "navigate", navigation_path: camera.navigation_path || this.config.navigation_path },
      });
      card.hass = this._hass;
      feed.replaceChildren(card);
    } catch (error) {
      feed.innerHTML = `<div class="missing"><div><ha-icon icon="mdi:alert-circle-outline"></ha-icon><br>Stream kunne ikke indlæses</div></div>`;
      console.error("HA Home Camera Card", error);
    }
  }

  _navigate(path) {
    if (!path) return;
    history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed", { bubbles: true, composed: true }));
  }

  _escape(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
}

class HaHomeCameraCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  setConfig(config) { this.config = structuredClone(config || HaHomeCameraCard.getStubConfig()); this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }
  _emit() { this.dispatchEvent(new CustomEvent("config-changed", { bubbles: true, composed: true, detail: { config: structuredClone(this.config) } })); }
  _escape(value) { return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  _render() {
    if (!this.shadowRoot || !this.config) return;
    this.config.groups ||= [];
    this.shadowRoot.innerHTML = `<style>*{box-sizing:border-box}.editor{display:grid;gap:12px;color:var(--primary-text-color)}.top,.group,.camera{display:grid;gap:8px;padding:12px;border:1px solid var(--divider-color);border-radius:12px}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}label span{display:block;margin-bottom:4px;color:var(--secondary-text-color);font-size:11px}input{width:100%;padding:9px;border:1px solid var(--divider-color);border-radius:8px;background:var(--card-background-color);color:inherit}.head{display:flex;justify-content:space-between;align-items:center}.camera{padding:9px}.add,.remove{padding:8px 10px;border:1px solid var(--primary-color);border-radius:8px;background:transparent;color:var(--primary-color);cursor:pointer}.remove{border-color:var(--error-color);color:var(--error-color)}ha-entity-picker{display:block}@media(max-width:600px){.fields{grid-template-columns:1fr}}</style><div class="editor"><div class="top fields"><label><span>Titel</span><input data-root="title" value="${this._escape(this.config.title || "")}"></label><label><span>Sti til alle kameraer</span><input data-root="navigation_path" value="${this._escape(this.config.navigation_path || "")}"></label></div>${this.config.groups.map((group, gi) => `<section class="group"><div class="head"><b>${this._escape(group.name || `Gruppe ${gi + 1}`)}</b><button class="remove" data-remove-group="${gi}">Fjern gruppe</button></div><div class="fields"><label><span>Gruppenavn</span><input data-group-field="name" data-group="${gi}" value="${this._escape(group.name || "")}"></label><label><span>Automatisk valg</span><ha-entity-picker data-group-picker="selector_entity" data-group="${gi}" value="${this._escape(group.selector_entity || "")}" allow-custom-entity></ha-entity-picker></label></div>${(group.cameras || []).map((camera, ci) => `<div class="camera"><div class="head"><b>${this._escape(camera.name || camera.key || `Kamera ${ci + 1}`)}</b><button class="remove" data-remove-camera="${ci}" data-group="${gi}">Fjern</button></div><div class="fields"><label><span>Nøgle</span><input data-camera-field="key" data-group="${gi}" data-camera="${ci}" value="${this._escape(camera.key || "")}"></label><label><span>Navn</span><input data-camera-field="name" data-group="${gi}" data-camera="${ci}" value="${this._escape(camera.name || "")}"></label><label><span>Kamera</span><ha-entity-picker data-camera-picker="entity" data-group="${gi}" data-camera="${ci}" value="${this._escape(camera.entity || "")}" include-domains='["camera"]' allow-custom-entity></ha-entity-picker></label><label><span>Bevægelsessensor (valgfri)</span><ha-entity-picker data-motion-picker data-group="${gi}" data-camera="${ci}" value="${this._escape(camera.detections?.motion || "")}" include-domains='["binary_sensor"]' allow-custom-entity></ha-entity-picker></label></div></div>`).join("")}<button class="add" data-add-camera="${gi}">+ Tilføj kamera</button></section>`).join("")}<button class="add" data-add-group>+ Tilføj gruppe</button></div>`;
    this.shadowRoot.querySelectorAll("ha-entity-picker").forEach((picker) => { picker.hass = this._hass; picker.addEventListener("value-changed", (event) => this._changePicker(picker, event.detail.value)); });
    this.shadowRoot.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => this._changeInput(input)));
    this.shadowRoot.querySelector("[data-add-group]")?.addEventListener("click", () => { this.config.groups.push({ name: "Ny gruppe", selector_entity: "", cameras: [] }); this._emit(); this._render(); });
    this.shadowRoot.querySelectorAll("[data-remove-group]").forEach((button) => button.addEventListener("click", () => { this.config.groups.splice(Number(button.dataset.removeGroup), 1); this._emit(); this._render(); }));
    this.shadowRoot.querySelectorAll("[data-add-camera]").forEach((button) => button.addEventListener("click", () => { this.config.groups[Number(button.dataset.addCamera)].cameras ||= []; this.config.groups[Number(button.dataset.addCamera)].cameras.push({ key: "camera", name: "Nyt kamera", entity: "" }); this._emit(); this._render(); }));
    this.shadowRoot.querySelectorAll("[data-remove-camera]").forEach((button) => button.addEventListener("click", () => { this.config.groups[Number(button.dataset.group)].cameras.splice(Number(button.dataset.removeCamera), 1); this._emit(); this._render(); }));
  }
  _changeInput(input) {
    if (input.dataset.root) this.config[input.dataset.root] = input.value;
    else if (input.dataset.groupField) this.config.groups[Number(input.dataset.group)][input.dataset.groupField] = input.value;
    else this.config.groups[Number(input.dataset.group)].cameras[Number(input.dataset.camera)][input.dataset.cameraField] = input.value;
    this._emit();
  }
  _changePicker(picker, value) {
    const group = this.config.groups[Number(picker.dataset.group)];
    if (picker.dataset.groupPicker) group[picker.dataset.groupPicker] = value;
    else {
      const camera = group.cameras[Number(picker.dataset.camera)];
      if (picker.dataset.motionPicker !== undefined) camera.detections = { ...(camera.detections || {}), motion: value };
      else camera[picker.dataset.cameraPicker] = value;
    }
    this._emit();
  }
}

if (!customElements.get("ha-home-camera-card")) customElements.define("ha-home-camera-card", HaHomeCameraCard);
if (!customElements.get("ha-home-camera-card-editor")) customElements.define("ha-home-camera-card-editor", HaHomeCameraCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "ha-home-camera-card", name: "HA Home Camera Card", description: "Responsive camera overview with automatic and manual camera selection", preview: true });
console.info(`%c HA-HOME-CAMERA-CARD %c ${VERSION} `, "color:#fff;background:#2563eb;font-weight:700", "color:#60a5fa;background:#0f172a");
