# HA Home Camera Card

## Neutral mobile preview

![Neutral mobile preview of ha-home-camera-card](docs/preview.png)

> Rendered with fictional Home Assistant entities and values. No private dashboard, person, address, camera, or sensor data is included.


Et responsivt Home Assistant-kort med ét fælles kamerakatalog og flere
kamerafelter. Hvert felt følger en valgsensor, kan overstyres lokalt og viser
aktivitet for person, dyr, køretøj, hændelse eller bevægelse. På både pc og
mobil står grupperne på én vandret række, og kameravalg åbnes i en kompakt menu
forankret ved den knap, der blev trykket på. Titel-linjen er som
standard skjult (`show_header: false`) og kan slås til i den visuelle editor
eller via config. Kameraerne vises uden `picture-glance`-kortets mørke
bundbjælke.

Selve kamerabilledet (ikke kun titel-linjen) kan trykkes for at navigere et
sted hen — sæt en global `navigation_path` for hele kortet, og/eller en
individuel `navigation_path` pr. kamera, som har forrang når den er sat.
Feedrammen håndhæves fysisk som 16:9 med klipning, så kameraer med et andet
kildeformat ikke kan gøre deres panel højere end de øvrige.
Kameraer kan desuden få individuel `fit_scale`. Standardværdien er altid `1`;
kortet indeholder ingen særlige regler for bestemte kameranavne eller nøgler.
Ved indlæsning og kameraskift vises kameraets seneste snapshot med det samme.
Kortet forindlæser som standard stillbillederne for de valgte kameraer, så et
bevægelsesstyret skift har et allerede dekodet billede klar, mens den ene nye
live-stream forbindes. Funktionen kan slås fra i den visuelle editor. Kortet
holder ikke skjulte live-streams åbne.
Live-feedet startes bagved og fades først ind, når dets billedmedie er klar.
Kort og editor genbruger deres eksisterende DOM ved uændrede konfigurationer og
irrelevante HA-state-opdateringer, så hover, fokus og åbne felter ikke flimrer.
Klik på et feed kan konfigureres som navigation, mere-info eller ingen handling.
På brede dashboardlayouts kan `fill_height: true` få et kamera-grid til at
udfylde hele den tildelte kolonne med lige høje rækker.
Standardnavigationen er tom, så kortet aldrig sender andre installationer til
en privat dashboardsti. Kameravælgeren åbner forankret direkte ved den knap,
der blev trykket på. Stjernen i vælgeren gemmer gruppens foretrukne kamera
lokalt i browseren. Hvis standardvalget skal deles mellem flere enheder, kan
gruppen i stedet få `fallback_select_entity`, som skal være en `input_select`
med kameranøglerne som muligheder. Alle kameraer, entiteter, navne og
navigationsstier kommer alene fra brugerens egen konfiguration.

I den visuelle editor oprettes kameraerne først i det fælles katalog. Kortet
slår kameraet op i Home Assistants entity-register og finder automatisk alle
tilgængelige smart-, lyd- og bevægelsesdetektioner på samme enhed. UniFi
Protect-eventens `event_types` bruges også, så blandt andet person, køretøj,
dyr, nummerplade, pakke, ansigt, røg, CO, tale, sirene og glasbrud bliver vist
som selvstændige valg. Fundne bindinger gemmes automatisk i kortets config, og
hver type kan derefter krydses til eller fra.

Under **Visningsvinduer** vælges 1–3 vinduer. Hvert vindue kan bruge alle eller
et udvalg af katalogets kameraer og kan starte som **Automatisk efter
smart-detektion** eller **Statisk kamera**. Automatisk tilstand skifter direkte
til det senest aktive kamera ud fra de valgte detektioner og går tilbage til
favorit/fallback, når aktiviteten udløber. Den kompakte dropdown kan altid
skifte mellem auto og et statisk kamera; stjernen vælger favoritkameraet.
En separat **Auto**-knap ud for hvert kamera bestemmer, om automatikken må
skifte til netop det kamera, uden at fjerne kameraet fra de manuelle valg.
Et tryk skifter samtidig vinduet tilbage til automatisk drift, så ændringen kan
ses med det samme.
Den eksterne valgsensor er fortsat valgfri af hensyn til ældre opsætninger.
Ældre konfigurationer med en kameraliste inde i hver gruppe migreres automatisk
af editoren.

```yaml
type: custom:ha-home-camera-card
title: Kameraer
navigation_path: /lovelace/cameras
click_action: navigate
show_header: false
groups:
  - name: Kamerafelt 1
    mode: auto
    camera_keys: [camera_1]
    auto_camera_keys: [camera_1]
    fallback_camera: camera_1
cameras:
  - key: camera_1
    name: Kamera 1
    entity: camera.example_camera
    navigation_path: /lovelace/cameras
    detections:
      person: binary_sensor.example_camera_person_detected
      motion: binary_sensor.example_camera_motion
    enabled_detections: [person, motion]
```

Editorens opdagelse bruger samme Home Assistant-`device_id` og understøtter
binære sensorer samt Protect-event entities. Event-advarsler holdes som
standard synlige i 30 sekunder; det kan ændres med
`detection_event_hold_seconds`. Hvis `detections` udelades, kan runtime stadig
finde almindelige standardnavne ud fra kameranøglen, fx
`binary_sensor.camera_1_person_detected`. Alle egne
tema-variable har fallback til Home Assistants standardvariabler og en normal
literal farve.

Kortet har en visuel editor til titel, navigationssti, fælles kamerakatalog,
automatisk fundne smart-detektioner, kamerafelter, valgsensorer og fallback.

## Installation

Kopiér `ha-home-camera-card.js` til
`/config/www/ha-home-camera-card/ha-home-camera-card.js`, registrér den som en
module-resource, og tilføj `custom:ha-home-camera-card` i dashboardeditoren.

## Licens

MIT.
