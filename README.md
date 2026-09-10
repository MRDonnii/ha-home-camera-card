# HA Home Camera Card

Et responsivt Home Assistant-kort, der samler flere automatiske kameragrupper i
ét `.js`-kort. Hver gruppe følger en valgsensor, kan overstyres lokalt og viser
aktivitet for person, dyr, køretøj, hændelse eller bevægelse. Desktop bruger
På både pc og mobil står grupperne på én vandret række, og kameravalg åbnes i et
kompakt bottom-sheet. Kortet har ingen ekstra overskrift, og kameraerne
vises uden `picture-glance`-kortets mørke bundbjælke.
Feedrammen håndhæves fysisk som 16:9 med klipning, så kameraer med et andet
kildeformat ikke kan gøre deres panel højere end de øvrige.
Kameraer kan desuden få individuel `fit_scale`; Fordør bruger som standard
`1.34`, så et 4:3-kildebillede fylder hele 16:9-rammen uden sorte sidefelter.

```yaml
type: custom:ha-home-camera-card
title: Kameraer lige nu
navigation_path: /teknik-overblik/overvagning
groups:
  - name: Forside
    selector_entity: sensor.active_front_camera
    cameras:
      - key: front_door
        name: Fordør
        entity: camera.front_door
        detections:
          motion: binary_sensor.front_door_motion
```

Hvis `detections` udelades, finder kortet automatisk standardnavne ud fra
kameranøglen, fx `binary_sensor.front_door_person_detected`. Alle egne
tema-variable har fallback til Home Assistants standardvariabler og en normal
literal farve.

Kortet har en visuel editor til titel, navigationssti, grupper, valgsensorer,
kameraer og valgfrie bevægelsessensorer.

## Installation

Kopiér `ha-home-camera-card.js` til
`/config/www/ha-home-camera-card/ha-home-camera-card.js`, registrér den som en
module-resource, og tilføj `custom:ha-home-camera-card` i dashboardeditoren.

## Licens

MIT.
