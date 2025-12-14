# ifm Industrial Background Music

## Übersicht
Das Spiel verwendet jetzt eine speziell für ifm entwickelte industrielle Hintergrundmusik, die echte Fabrik- und Automatisierungsgeräusche nachahmt.

## Industrielle Sounds
- **Basis-Brummen (50Hz + Obertöne)**: Typische Fabrik-Atmosphäre
- **Sensor-Pulse (alle 2 Sekunden)**: ifm Sensor-Automatisierung bei 800Hz
- **Pneumatik-Geräusche (alle 4 Sekunden)**: Druckluft-Systeme (typisch bei ifm-Anwendungen)
- **Förderband-Rhythmus**: Subtiler 2.2Hz Rhythmus für ifm-Positionssensoren
- **IO-Link Kommunikation (alle 6 Sekunden)**: ifm IO-Link Datenaustausch bei 1000Hz
- **Motor-Brummen**: Variable 25Hz Frequenz für ifm-Vibrations-Monitoring

## Audio-Features
- **8-Sekunden Loop**: Nahtlose Wiederholung
- **Lautstärke**: 20% für subtile Hintergrund-Atmosphäre
- **Fallback**: Automatischer Wechsel zur Original-Musik bei Fehlern
- **Web Audio API**: Echtzeitgenerierung der industriellen Sounds

## Technische Details
- Samplerate: 8000 Hz (optimiert für Dateigröße)
- Format: WAV als Data URL
- Algorithmus: Additive Synthese mit mehreren Frequenzen
- Filterung: Soft Limiting (Tanh) für natürlichen Sound

Die Musik verstärkt das ifm-Branding und schafft eine authentische Industrieatmosphäre! 🏭🎵
