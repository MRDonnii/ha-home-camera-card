const VERSION = "0.3.2";

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
      navigation_path: "/teknik-overblik/overvagning",
      click_action: "navigate",
      show_header: true,
      groups: [
        {
          name: "Forside",
          selector_entity: "sensor.active_front_camera",
          cameras: [{ key: "front_door", name: "Fordør", entity: "camera.front_door", navigation_path: "" }],
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
    const nextConfig = {
      title: "Kameraer lige nu",
      navigation_path: "/teknik-overblik/overvagning",
      click_action: "navigate",
      aspect_ratio: "16:9",
      show_header: false,
      ...config,
    };
    const signature = JSON.stringify(nextConfig);
    if (signature === this._configSignature) {
      this.config = nextConfig;
      return;
    }
    this.config = nextConfig;
    this._configSignature = signature;
    this._generation += 1;
    this._feedEntities = {};
    this._hassSignature = "";
    this._renderShell();
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    const signature = this._allWatched().map((id) => {
      const state = hass?.states?.[id];
      return `${id}:${state?.state || ""}:${state?.last_changed || ""}:${state?.attributes?.entity_picture || ""}`;
    }).join("|");
    if (signature === this._hassSignature) return;
    this._hassSignature = signature;
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
      :host{display:block;--card-surface:var(--dashboard-card-bg,var(--ha-card-background,var(--card-background-color,#1c1f26)));--card-solid:var(--card-background-color,#1c1f26);--text:var(--gray800,var(--primary-text-color,#f8fafc));--muted:var(--gray600,var(--secondary-text-color,#94a3b8));--edge:var(--dashboard-border-neutral,var(--divider-color,rgba(148,163,184,.2)));--accent:var(--dashboard-accent,var(--primary-color,#62b5ff));--ok:var(--dashboard-success,var(--success-color,#54d9aa));--warn:var(--dashboard-warning,var(--warning-color,#ffbd59));--danger:var(--dashboard-danger,var(--error-color,#ff667a));--animal:var(--dashboard-orange,var(--warning-color,#f97316));--object:var(--dashboard-purple,var(--accent-color,#a855f7));--motion:var(--dashboard-cyan,var(--info-color,#06b6d4));color:var(--text)}
      *{box-sizing:border-box}ha-card{overflow:hidden;border:0;border-left:4px solid var(--accent);border-radius:18px;background:var(--card-surface);box-shadow:var(--state-card-shadow,var(--ha-card-box-shadow,0 12px 30px rgba(0,0,0,.18)))}
      header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 14px 4px}.heading{display:flex;align-items:center;gap:10px;min-width:0}.heading ha-icon{color:var(--accent)}h2{margin:0;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sub{margin-top:2px;color:var(--muted);font-size:11px}.all{display:flex;align-items:center;gap:5px;border:1px solid var(--edge);border-radius:999px;padding:7px 10px;background:transparent;color:var(--text);font:inherit;font-size:11px;font-weight:750;cursor:pointer;flex:0 0 auto}.all ha-icon{--mdc-icon-size:16px;color:var(--accent)}
      .grid{display:grid;grid-template-columns:repeat(var(--columns,3),minmax(0,1fr));gap:10px;padding:12px}.panel{min-width:0;overflow:hidden;border:0;border-radius:15px;background:linear-gradient(180deg,color-mix(in srgb,var(--text) 7%,transparent),transparent),var(--card-surface)}
      .bar{display:flex;align-items:center;gap:5px;padding:6px}.name{min-width:0;flex:1}.name b,.name span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.name b{font-size:11px}.name span{display:none;color:var(--muted);font-size:9px}.activity{display:flex;align-items:center;gap:4px;color:var(--ok);font-size:10px;font-weight:800}.activity span{display:none}.activity ha-icon{--mdc-icon-size:14px}.person .activity{color:var(--danger)}.animal .activity{color:var(--animal)}.vehicle .activity{color:var(--accent)}.object .activity{color:var(--object)}.motion .activity{color:var(--motion)}.choose{display:grid;width:29px;height:29px;place-items:center;border:1px solid var(--edge);border-radius:50%;padding:0;background:transparent;color:var(--text);cursor:pointer}.choose ha-icon{--mdc-icon-size:16px;color:var(--accent)}
      .feed{position:relative;min-width:0;min-height:0;overflow:hidden;aspect-ratio:16/9;contain:layout paint;cursor:pointer;background:var(--camera-feed-background,var(--ha-card-background,#05080d))}.feed>*{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;display:block;overflow:hidden;pointer-events:none}.snapshot{z-index:2;object-fit:cover;opacity:1;transition:opacity .28s ease;background:var(--camera-feed-background,var(--ha-card-background,#05080d))}.live-card{z-index:1;opacity:0;transition:opacity .28s ease}.feed.ready .snapshot{opacity:0}.feed.ready .live-card{opacity:1}.chips{display:none}.chip{flex:0 0 auto;border:1px solid var(--edge);border-radius:999px;padding:5px 8px;background:transparent;color:var(--muted);font:inherit;font-size:9px;font-weight:750;cursor:pointer}.chip.active{border-color:color-mix(in srgb,var(--accent) 68%,transparent);background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--text)}
      .missing{display:grid!important;place-items:center;color:var(--muted);font-size:12px}.missing ha-icon{--mdc-icon-size:30px;margin-bottom:5px}.missing div{text-align:center}
      dialog{position:fixed;width:min(90vw,320px);max-height:min(70vh,520px);margin:0;border:1px solid var(--edge);border-radius:16px;padding:0;background:var(--card-surface);color:var(--text);box-shadow:0 16px 42px rgba(0,0,0,.38);transform-origin:top right}dialog::backdrop{background:rgba(0,0,0,.28);backdrop-filter:blur(1px)}.sheet-head{display:flex;align-items:center;justify-content:space-between;padding:10px 11px 8px;border-bottom:1px solid var(--edge)}.sheet-head b{font-size:13px}.close{display:grid;width:30px;height:30px;place-items:center;border:0;border-radius:50%;background:color-mix(in srgb,var(--card-solid) 85%,var(--text) 15%);color:var(--text);cursor:pointer}.close ha-icon{--mdc-icon-size:17px}.choices{display:grid;gap:6px;overflow:auto;padding:9px}.choice{display:flex;align-items:center;gap:9px;width:100%;min-height:42px;border:1px solid var(--edge);border-radius:11px;padding:7px 10px;background:transparent;color:var(--text);font:inherit;text-align:left;cursor:pointer}.choice ha-icon{--mdc-icon-size:18px;color:var(--muted)}.choice span{flex:1;font-size:12px;font-weight:700}.choice.active{border-color:color-mix(in srgb,var(--accent) 70%,transparent);background:color-mix(in srgb,var(--accent) 12%,transparent)}.choice.active ha-icon,.choice .check{color:var(--accent)}
      @media(max-width:900px){.grid{grid-template-columns:repeat(var(--columns,3),minmax(0,1fr))}.feed{aspect-ratio:16/9}}
      @media(max-width:600px){header{padding:10px 10px 3px}.grid{grid-template-columns:repeat(var(--columns,3),minmax(0,1fr));padding:7px;gap:5px}.chips{display:none}.choose{display:grid;width:27px;height:27px}.choose ha-icon{--mdc-icon-size:15px}.bar{padding:5px;gap:3px}.name b{font-size:10px}.name span,.activity span{display:none}.activity ha-icon{--mdc-icon-size:13px}.feed{aspect-ratio:16/9}}
    </style><ha-card>${this.config.show_header ? `<header><div class="heading"><ha-icon icon="mdi:cctv"></ha-icon><div><h2>${this._escape(this.config.title)}</h2><div class="sub">Automatisk valg med manuel overstyring</div></div></div><button class="all" data-nav><ha-icon icon="mdi:view-dashboard-outline"></ha-icon><span>Alle kameraer</span></button></header>` : ""}<div class="grid" style="--columns:${Math.min(3, this.config.groups.length)}">${this.config.groups.map((group, index) => `<section class="panel quiet" data-panel="${index}"><div class="bar"><div class="name"><b data-name></b><span>${this._escape(group.name || `Gruppe ${index + 1}`)}</span></div><div class="activity"><ha-icon data-activity-icon></ha-icon><span data-activity-text></span></div><button class="choose" data-choose="${index}" aria-label="Vælg kamera"><ha-icon icon="mdi:camera-switch-outline"></ha-icon></button></div><div class="feed" data-feed="${index}"></div><div class="chips"><button class="chip" data-auto="${index}">Auto</button>${(group.cameras || []).map((camera) => `<button class="chip" data-group="${index}" data-camera="${this._escape(camera.key)}">${this._escape(camera.name || camera.key)}</button>`).join("")}</div></section>`).join("")}</div></ha-card><dialog data-dialog><div class="sheet-head"><b data-dialog-title>Vælg kamera</b><button class="close" data-close aria-label="Luk"><ha-icon icon="mdi:close"></ha-icon></button></div><div class="choices" data-choices></div></dialog>`;
    this.shadowRoot.querySelector("[data-nav]")?.addEventListener("click", () => this._navigate(this.config.navigation_path));
    this.shadowRoot.querySelectorAll("[data-camera]").forEach((button) => button.addEventListener("click", () => {
      this._manual[Number(button.dataset.group)] = button.dataset.camera;
      this._update();
    }));
    this.shadowRoot.querySelectorAll("[data-auto]").forEach((button) => button.addEventListener("click", () => {
      delete this._manual[Number(button.dataset.auto)];
      this._update();
    }));
    this.shadowRoot.querySelectorAll("[data-choose]").forEach((button) => button.addEventListener("click", () => this._openPicker(Number(button.dataset.choose), button)));
    this.shadowRoot.querySelectorAll("[data-feed]").forEach((feed) => feed.addEventListener("click", () => this._handleFeedClick(Number(feed.dataset.feed))));
    const dialog = this.shadowRoot.querySelector("[data-dialog]");
    this.shadowRoot.querySelector("[data-close]")?.addEventListener("click", () => dialog?.close());
    dialog?.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  }

  _handleFeedClick(index) {
    const group = this.config.groups[index];
    const camera = group ? this._selected(group, index) : undefined;
    const action = camera?.click_action || this.config.click_action || "navigate";
    if (action === "none") return;
    if (action === "more-info" && camera?.entity) {
      this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: camera.entity } }));
      return;
    }
    this._navigate(camera?.navigation_path || this.config.navigation_path || "/teknik-overblik/overvagning");
  }

  _openPicker(index, anchor) {
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
    requestAnimationFrame(() => {
      const anchorRect = anchor.getBoundingClientRect();
      const dialogRect = dialog.getBoundingClientRect();
      const gap = 7;
      const left = Math.min(window.innerWidth - dialogRect.width - 8, Math.max(8, anchorRect.right - dialogRect.width));
      const roomBelow = window.innerHeight - anchorRect.bottom - gap;
      const top = roomBelow >= dialogRect.height ? anchorRect.bottom + gap : Math.max(8, anchorRect.top - dialogRect.height - gap);
      dialog.style.left = `${left}px`;
      dialog.style.top = `${top}px`;
      dialog.style.transformOrigin = `${Math.min(dialogRect.width - 18, Math.max(18, anchorRect.left + anchorRect.width / 2 - left))}px ${roomBelow >= dialogRect.height ? "0" : "100%"}`;
    });
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
      const card = this.shadowRoot.querySelector(`[data-feed="${index}"] [data-live-card]`);
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
    feed.classList.remove("ready");
    const snapshot = document.createElement("img");
    snapshot.className = "snapshot";
    snapshot.alt = camera.name || camera.key || "Kamera";
    snapshot.decoding = "async";
    const entityPicture = state.attributes?.entity_picture;
    if (entityPicture) snapshot.src = this._hass.hassUrl(entityPicture);
    else if (state.attributes?.access_token) snapshot.src = this._hass.hassUrl(`/api/camera_proxy/${camera.entity}?token=${state.attributes.access_token}`);
    feed.replaceChildren(snapshot);
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
        tap_action: { action: "none" },
      });
      card.classList.add("live-card");
      card.dataset.liveCard = "";
      const fitScale = Number(camera.fit_scale || (camera.key === "fordor" ? 1.34 : 1));
      if (Number.isFinite(fitScale) && fitScale > 0) {
        card.style.transform = `scale(${fitScale})`;
        card.style.transformOrigin = "center center";
      }
      card.hass = this._hass;
      feed.appendChild(card);
      this._revealWhenReady(feed, card, generation, camera.entity);
    } catch (error) {
      feed.innerHTML = `<div class="missing"><div><ha-icon icon="mdi:alert-circle-outline"></ha-icon><br>Stream kunne ikke indlæses</div></div>`;
      console.error("HA Home Camera Card", error);
    }
  }

  _mediaReady(node) {
    if (!node) return false;
    if (node instanceof HTMLVideoElement && node.readyState >= 2) return true;
    if (node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0) return true;
    if (node.shadowRoot && this._mediaReady(node.shadowRoot)) return true;
    return Array.from(node.children || []).some((child) => this._mediaReady(child));
  }

  _revealWhenReady(feed, card, generation, entity, attempt = 0) {
    if (generation !== this._generation || this._feedEntities[feed.dataset.feed] !== entity || !card.isConnected) return;
    if ((attempt >= 4 && this._mediaReady(card)) || attempt >= 80) {
      feed.classList.add("ready");
      setTimeout(() => feed.querySelector(".snapshot")?.remove(), 320);
      return;
    }
    setTimeout(() => this._revealWhenReady(feed, card, generation, entity, attempt + 1), 100);
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
  setConfig(config) {
    const nextConfig = structuredClone(config || HaHomeCameraCard.getStubConfig());
    const signature = JSON.stringify(nextConfig);
    this.config = nextConfig;
    if (signature === this._configSignature && this.shadowRoot.hasChildNodes()) return;
    this._configSignature = signature;
    this._render();
  }
  set hass(hass) {
    this._hass = hass;
    this.shadowRoot.querySelectorAll("ha-entity-picker").forEach((picker) => { picker.hass = hass; });
  }
  _emit() {
    this._configSignature = JSON.stringify(this.config);
    this.dispatchEvent(new CustomEvent("config-changed", { bubbles: true, composed: true, detail: { config: structuredClone(this.config) } }));
  }
  _escape(value) { return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  _render() {
    if (!this.shadowRoot || !this.config) return;
    this.config.groups ||= [];
    this.shadowRoot.innerHTML = `<style>*{box-sizing:border-box}.editor{display:grid;gap:12px;color:var(--primary-text-color)}.top,.group,.camera{display:grid;gap:8px;padding:12px;border:1px solid var(--divider-color);border-radius:12px}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}label span{display:block;margin-bottom:4px;color:var(--secondary-text-color);font-size:11px}input{width:100%;padding:9px;border:1px solid var(--divider-color);border-radius:8px;background:var(--card-background-color);color:inherit}.head{display:flex;justify-content:space-between;align-items:center}.camera{padding:9px}.add,.remove{padding:8px 10px;border:1px solid var(--primary-color);border-radius:8px;background:transparent;color:var(--primary-color);cursor:pointer}.remove{border-color:var(--error-color);color:var(--error-color)}ha-entity-picker{display:block}.check{display:flex!important;flex-direction:row-reverse;align-items:center;justify-content:flex-end;gap:8px}.check span{margin:0!important}.check input{width:auto!important}@media(max-width:600px){.fields{grid-template-columns:1fr}}</style><div class="editor"><div class="top fields"><label><span>Titel</span><input data-root="title" value="${this._escape(this.config.title || "")}"></label><label><span>Sti til alle kameraer</span><input data-root="navigation_path" value="${this._escape(this.config.navigation_path || "")}"></label><label class="check"><span>Vis titel-linje</span><input type="checkbox" data-root-check="show_header" ${this.config.show_header ? "checked" : ""}></label></div>${this.config.groups.map((group, gi) => `<section class="group"><div class="head"><b>${this._escape(group.name || `Gruppe ${gi + 1}`)}</b><button class="remove" data-remove-group="${gi}">Fjern gruppe</button></div><div class="fields"><label><span>Gruppenavn</span><input data-group-field="name" data-group="${gi}" value="${this._escape(group.name || "")}"></label><label><span>Automatisk valg</span><ha-entity-picker data-group-picker="selector_entity" data-group="${gi}" value="${this._escape(group.selector_entity || "")}" allow-custom-entity></ha-entity-picker></label></div>${(group.cameras || []).map((camera, ci) => `<div class="camera"><div class="head"><b>${this._escape(camera.name || camera.key || `Kamera ${ci + 1}`)}</b><button class="remove" data-remove-camera="${ci}" data-group="${gi}">Fjern</button></div><div class="fields"><label><span>Nøgle</span><input data-camera-field="key" data-group="${gi}" data-camera="${ci}" value="${this._escape(camera.key || "")}"></label><label><span>Navn</span><input data-camera-field="name" data-group="${gi}" data-camera="${ci}" value="${this._escape(camera.name || "")}"></label><label><span>Kamera</span><ha-entity-picker data-camera-picker="entity" data-group="${gi}" data-camera="${ci}" value="${this._escape(camera.entity || "")}" include-domains='["camera"]' allow-custom-entity></ha-entity-picker></label><label><span>Billedzoom (1 = ingen)</span><input type="number" min="1" max="3" step="0.01" data-camera-field="fit_scale" data-group="${gi}" data-camera="${ci}" value="${this._escape(camera.fit_scale || (camera.key === "fordor" ? 1.34 : 1))}"></label><label><span>Bevægelsessensor (valgfri)</span><ha-entity-picker data-motion-picker data-group="${gi}" data-camera="${ci}" value="${this._escape(camera.detections?.motion || "")}" include-domains='["binary_sensor"]' allow-custom-entity></ha-entity-picker></label><label><span>Sti ved tryk på kamera (valgfri, ellers "Sti til alle kameraer")</span><input data-camera-field="navigation_path" data-group="${gi}" data-camera="${ci}" value="${this._escape(camera.navigation_path || "")}"></label></div></div>`).join("")}<button class="add" data-add-camera="${gi}">+ Tilføj kamera</button></section>`).join("")}<button class="add" data-add-group>+ Tilføj gruppe</button></div>`;
    const actionLabel = document.createElement("label");
    actionLabel.innerHTML = `<span>Klikhandling</span><select data-root="click_action"><option value="navigate">Navigér</option><option value="more-info">Mere info</option><option value="none">Ingen handling</option></select>`;
    const actionSelect = actionLabel.querySelector("select");
    actionSelect.value = this.config.click_action || "navigate";
    actionSelect.style.cssText = "width:100%;padding:9px;border:1px solid var(--divider-color);border-radius:8px;background:var(--card-background-color);color:inherit";
    this.shadowRoot.querySelector(".top")?.insertBefore(actionLabel, this.shadowRoot.querySelector(".top")?.children[1] || null);
    this.shadowRoot.querySelectorAll("ha-entity-picker").forEach((picker) => { picker.hass = this._hass; picker.addEventListener("value-changed", (event) => this._changePicker(picker, event.detail.value)); });
    actionSelect.addEventListener("change", () => this._changeInput(actionSelect));
    this.shadowRoot.querySelectorAll("input[type=text], input:not([type])").forEach((input) => input.addEventListener("change", () => this._changeInput(input)));
    this.shadowRoot.querySelectorAll("input[type=number]").forEach((input) => input.addEventListener("change", () => this._changeInput(input)));
    this.shadowRoot.querySelectorAll("input[type=checkbox]").forEach((input) => input.addEventListener("change", () => this._changeCheckbox(input)));
    this.shadowRoot.querySelector("[data-add-group]")?.addEventListener("click", () => { this.config.groups.push({ name: "Ny gruppe", selector_entity: "", cameras: [] }); this._emit(); this._render(); });
    this.shadowRoot.querySelectorAll("[data-remove-group]").forEach((button) => button.addEventListener("click", () => { this.config.groups.splice(Number(button.dataset.removeGroup), 1); this._emit(); this._render(); }));
    this.shadowRoot.querySelectorAll("[data-add-camera]").forEach((button) => button.addEventListener("click", () => { this.config.groups[Number(button.dataset.addCamera)].cameras ||= []; this.config.groups[Number(button.dataset.addCamera)].cameras.push({ key: "camera", name: "Nyt kamera", entity: "" }); this._emit(); this._render(); }));
    this.shadowRoot.querySelectorAll("[data-remove-camera]").forEach((button) => button.addEventListener("click", () => { this.config.groups[Number(button.dataset.group)].cameras.splice(Number(button.dataset.removeCamera), 1); this._emit(); this._render(); }));
  }
  _changeCheckbox(input) {
    if (input.dataset.rootCheck) this.config[input.dataset.rootCheck] = input.checked;
    this._emit();
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
