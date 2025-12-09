# 🎤 Präsentations-Script: Production Runner
**Zwischenpräsentation - 12.12.2025**

---

## 📊 Präsentations-Aufbau (10-15 Minuten)

### **1. Einleitung (2 Min)**
### **2. Spielkonzept & Thematischer Bezug (2 Min)**
### **3. Technische Umsetzung (3 Min)**
### **4. Live-Demo (5 Min)**
### **5. Herausforderungen & Lösungen (2 Min)**
### **6. Ausblick Phase 3 (1 Min)**

---

## 🎯 Detailliertes Script

### **FOLIE 1: Titel**
> **"Guten Tag! Wir präsentieren heute 'Production Runner' - ein industrielles Pac-Man-Spiel, das wir für ifm statmath entwickelt haben."**

**Was zeigen:**
- Logo/Titel
- Team-Namen
- Datum: 12.12.2025

---

### **FOLIE 2: Projektziel & Kontext**

**Script:**
> **"Production Runner ist ein Gamification-Projekt für Wartezeiten in ifm statmath Produkten. Während ein Machine-Learning-Modell trainiert oder eine Produktionsplanung berechnet wird, können Mitarbeiter dieses Spiel spielen."**

> **"Das Besondere: Das Spiel läuft auf einem Arcade-Automaten, den wir für Messestände vorbereitet haben. Es nutzt einen Raspberry Pi 4 und professionelle Arcade-Controller."**

**Was zeigen:**
- Screenshot: s.FOX / moneo IAIA (ifm Produkte)
- Foto: Arcade-Cabinet
- Use-Case Grafik: Warten → Spielen → Produktiv bleiben

**Key Points:**
- ✅ Gamification für Ladezeiten
- ✅ Messestands-tauglich
- ✅ Thematischer Bezug zu Industrie 4.0

---

### **FOLIE 3: Spielkonzept**

**Script:**
> **"Die Spielmechanik basiert auf Pac-Man, aber industriell adaptiert:"**

> **"Der Spieler steuert einen AGV - ein automatisches Transportfahrzeug - durch eine Fabrikhalle. Das Ziel ist es, alle Produktionsaufträge einzusammeln."**

> **"Dabei muss man 4 fehlerhafte Sensoren vermeiden, die jeweils unterschiedliche KI-Verhaltensweisen haben:"**
- **Rot (Aggressive):** Verfolgt den Spieler direkt
- **Rosa (Ambush):** Lauert dem Spieler voraus
- **Cyan (Patrol):** Folgt festen Routen
- **Orange (Random):** Bewegt sich unberechenbar

> **"Das Power-Up 'KI-Optimierung' verwandelt die Sensoren temporär, sodass man sie reparieren kann - für 200 Punkte."**

**Was zeigen:**
- Screenshot: Gameplay mit AGV + Sensoren
- Tabelle: 4 Gegner-Typen mit Farben
- Icon: KI-Optimierung Power-Up

**Key Points:**
- ✅ Industrial Theme (AGV statt Pac-Man)
- ✅ 4 unterschiedliche Gegner-KIs
- ✅ Power-Up Mechanik

---

### **FOLIE 4: Thematischer Bezug zu ifm statmath**

**Script:**
> **"Wir haben bewusst Verbindungen zu ifm statmath Produkten hergestellt:"**

> **"In s.FOX repräsentiert das Labyrinth einen Produktionsplan. Jeder gesammelte Auftrag ist ein optimierter Task. Der Production Streak Bonus belohnt effizientes Arbeiten - wie in der echten Produktionsoptimierung."**

> **"Bei moneo IAIA Smart Limit Watcher symbolisieren die Sensoren Anomalien oder Alarme, die erkannt und behoben werden müssen."**

**Was zeigen:**
- Logo: s.FOX + moneo IAIA
- Grafik: Spielmechanik ↔ Produkt-Features
- Beispiel: Streak-Bonus = Produktionseffizienz

**Key Points:**
- ✅ Direkter Bezug zu s.FOX (Produktionsplanung)
- ✅ Direkter Bezug zu IAIA (Anomalie-Erkennung)
- ✅ Gamification der echten Use-Cases

---

### **FOLIE 5: Technische Architektur**

**Script:**
> **"Technisch haben wir einen modernen Full-Stack aufgebaut:"**

> **"Das Frontend ist in Angular 18 entwickelt mit Canvas-basiertem Rendering für flüssige Animationen. Wir nutzen die Gamepad API für USB-Controller-Steuerung."**

> **"Das Backend läuft mit ASP.NET Core 9.0 und bietet eine REST-API für Highscore-Management. Mit SignalR haben wir ein Echtzeit-Leaderboard implementiert."**

> **"Für die Persistenz nutzen wir SQLite im Development und können auf PostgreSQL für Production skalieren."**

> **"Das gesamte System läuft dockerisiert - mit einem Befehl startbar auf jeder Platform, auch auf ARM64 für den Raspberry Pi."**

**Was zeigen:**
```
┌─────────────────────────────────────┐
│        Frontend (Angular)           │
│  - Canvas Game Engine               │
│  - Gamepad API                      │
│  - Arcade UI (CRT Effects)          │
└───────────────┬─────────────────────┘
                │ HTTP/SignalR
┌───────────────▼─────────────────────┐
│       Backend (ASP.NET Core)        │
│  - REST API                         │
│  - SignalR Hub                      │
│  - EF Core                          │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│    Database (SQLite/PostgreSQL)     │
│  - Players                          │
│  - Scores                           │
│  - Leaderboard                      │
└─────────────────────────────────────┘

      Docker Compose Orchestration
```

**Key Points:**
- ✅ Angular 18 + TypeScript
- ✅ ASP.NET Core 9.0 + C#
- ✅ SQLite/PostgreSQL
- ✅ Docker + Docker Compose
- ✅ SignalR für Echtzeit-Updates

---

### **FOLIE 6: Gameplay-Features**

**Script:**
> **"Wir haben bereits alle Phase 2 Requirements erfüllt und viele Phase 3 Features implementiert:"**

**Phase 2 (gefordert):**
- ✅ Labyrinth-Layout mit Grid-System
- ✅ AGV-Steuerung per Gamepad/Keyboard
- ✅ Kollisionserkennung
- ✅ 4 Gegner-KI-Typen
- ✅ Highscore-System

**Phase 3 (bereits implementiert):**
- ✅ Vollständiges Scoring mit Multiplikatoren
- ✅ Production Streak Bonus (x1.5 bis x3.0)
- ✅ Power-Up Mechanik (Scared Mode)
- ✅ Level-System mit Progression
- ✅ Game States (Ready, Playing, Death, Level Complete, Game Over)
- ✅ Echtzeit-Leaderboard mit SignalR
- ✅ Arcade-Style UI mit CRT-Effekten
- ✅ Input Buffering für präzise Steuerung
- ✅ Docker-Deployment

**Was zeigen:**
- Checkliste mit ✅ Häkchen
- Screenshot: Game States
- Screenshot: Leaderboard
- Screenshot: Arcade UI

**Key Points:**
- ✅ Alle Phase 2 Anforderungen erfüllt
- ✅ 80% von Phase 3 bereits fertig
- ✅ Spielbereit für Arcade-Cabinet

---

### **FOLIE 7: LIVE-DEMO** 🎮

**Script:**
> **"Jetzt zeigen wir das Spiel live!"**

**Demo-Ablauf (5 Minuten):**

1. **Start-Screen (30s)**
   - Namen eingeben
   - Spielmodus wählen (Classic/Industrial)
   - Mit Gamepad navigieren

2. **Gameplay (2 Min)**
   - Bewegung in alle 4 Richtungen zeigen
   - Pellets sammeln (Score steigt)
   - Power-Up aktivieren
   - Scared Ghost "reparieren" (+200 Punkte)
   - Absichtlich sterben → Death-Animation

3. **Level Complete (1 Min)**
   - Level durchspielen
   - Level-Complete Bonus zeigen (+1000)
   - Nächstes Level startet

4. **Game Over (1 Min)**
   - Sterben bis Game Over
   - Highscore-Submission
   - Leaderboard anzeigen
   - Eigener Score in Top 5

**Kommentar während Demo:**
> **"Wie ihr seht, reagiert die Steuerung präzise. Das liegt am Input Buffering - der nächste Richtungswechsel wird gepuffert und beim nächsten möglichen Moment ausgeführt."**

> **"Die Gegner haben unterschiedliche Verhaltensweisen. Der rote verfolgt mich direkt, während der rosa versucht, mir den Weg abzuschneiden."**

> **"Nach dem Power-Up kann ich die Sensoren reparieren - das gibt 200 Punkte pro Sensor."**

**Backup-Plan bei Problemen:**
- Gamepad funktioniert nicht → Keyboard verwenden
- Spiel laggt → Video-Recording zeigen
- Backend down → Offline-Modus demonstrieren

---

### **FOLIE 8: Technische Highlights**

**Script:**
> **"Einige technische Details, die das Spiel besonders machen:"**

**1. Input Buffering:**
> **"Wir haben ein Buffering-System implementiert. Wenn man zu früh in eine Richtung drückt, wird der Input gespeichert und beim nächsten möglichen Zeitpunkt ausgeführt. Das macht die Steuerung viel präziser als im Original Pac-Man."**

**2. Ghost AI mit Scatter/Chase Modes:**
> **"Die Gegner-KI wechselt zwischen 'Scatter' (zurück in Ecken) und 'Chase' (Spieler verfolgen). Das ist eine authentische Adaption des Original Pac-Man Verhaltens."**

**3. Ghost Release Timer:**
> **"Damit Gegner nicht in ihrer Startbox stecken bleiben, haben wir einen Timer implementiert, der sie alle 2 Sekunden rausdrängt."**

**4. Canvas-Performance-Optimierung:**
> **"Wir hatten anfangs Probleme mit niedrigen FPS. Durch Entfernung von shadowBlur-Effekten laufen wir jetzt stabil mit 30 FPS, auch auf dem Raspberry Pi."**

**5. Docker Multi-Platform:**
> **"Das Docker-Setup unterstützt sowohl x86_64 als auch ARM64 - läuft also auf normalem PC und Raspberry Pi."**

**Was zeigen:**
- Code-Snippet: `canChangeTo()` Methode
- Code-Snippet: `ghostReleaseTimer` Logic
- Grafik: Scatter/Chase Pattern
- Performance-Diagramm (vor/nach Optimierung)

**Key Points:**
- ✅ Input Buffering für besseres Gameplay
- ✅ Authentische Pac-Man AI
- ✅ Performance-optimiert
- ✅ Cross-Platform (x86/ARM)

---

### **FOLIE 9: Herausforderungen & Lösungen**

**Script:**
> **"Während der Entwicklung sind wir auf mehrere Herausforderungen gestoßen:"**

**Challenge 1: Performance-Probleme**
> **"Problem: Ursprünglich hatten wir shadowBlur-Effekte auf allen Wänden. Das führte zu unter 10 FPS."**
> **"Lösung: Wir haben die Effekte entfernt und nutzen jetzt flache Farben. Das brachte uns auf stabile 30 FPS."**

**Challenge 2: Corner-Turning Schwierigkeiten**
> **"Problem: Im Grid-System war es schwer, präzise um Ecken zu fahren. Man musste exakt im richtigen Moment drücken."**
> **"Lösung: Input Buffering. Der nächste Input wird gespeichert und beim nächsten validen Moment ausgeführt."**

**Challenge 3: Ghosts bleiben in Box**
> **"Problem: Manchmal sind Gegner in ihrer Startbox stecken geblieben."**
> **"Lösung: Ghost Release Timer - alle 2 Sekunden wird geprüft, ob ein Gegner noch in der Box ist, und er wird nach oben gedrängt."**

**Challenge 4: .NET SDK Kompatibilität**
> **"Problem: .NET 10.0 SDK war noch nicht verfügbar."**
> **"Lösung: Downgrade auf .NET 9.0 - stabile Version mit voller ARM64-Unterstützung für Raspberry Pi."**

**Was zeigen:**
- Vorher/Nachher FPS-Vergleich
- Diagramm: Input-Buffering erklärt
- Code-Diff: Release Timer Implementation

**Key Points:**
- ✅ Probleme erkannt und gelöst
- ✅ Performance deutlich verbessert
- ✅ Gameplay-Feel optimiert
- ✅ Platform-Kompatibilität sichergestellt

---

### **FOLIE 10: Projektmanagement & Tools**

**Script:**
> **"Für das Projekt haben wir professionelle Tools genutzt:"**

**Git & GitHub:**
- 11 Pull Requests
- Feature-Branches (Eingabe-Name, Docker-ProductionrunnerAPI)
- Merge-Conflicts gelöst
- Sauberer .gitignore (obj/bin ausgeschlossen)

**Docker:**
- Multi-Stage Builds
- docker-compose.yml mit 3 Services
- Environment-Variablen für Config
- Volume-Mapping für Datenbank

**Testing:**
- Lokales Testing (Windows + WSL)
- Backend-API mit Swagger
- Angular Dev-Server mit Proxy
- Gamepad-Testing im Browser

**Was zeigen:**
- GitHub Repository Screenshot
- Git-Log mit Commits
- docker-compose.yml Struktur
- Swagger API Dokumentation

**Key Points:**
- ✅ Versionskontrolle mit Git
- ✅ CI-ready (Docker)
- ✅ Dokumentiert (README, Guides)
- ✅ Testbar auf jedem System

---

### **FOLIE 11: Ausblick Phase 3**

**Script:**
> **"Für die finale Phase 3 planen wir folgende Ergänzungen:"**

**Features:**
- Das Spiel für 02 gleichzeitig spielbar zu machen
- 🎵 Sound-Effekte (Pellet-Collection, Power-Up, Death)
- 🎶 Hintergrundmusik (GEMA-freie 8-Bit Chiptune)
- 🎨 Finale Pixel-Art Assets (AGV, Sensoren, Fabrik-Elemente)
- 🏆 Erweiterte Statistiken (Gesammelte Aufträge, Reparierte Sensoren)
- 📱 Responsive Design für andere Displays
- 🌐 Multi-Language Support (DE/EN)

**Testing:**
- ✅ Arcade-Hardware Testing (Raspberry Pi)
- ✅ Performance-Profiling auf echter Hardware
- ✅ User-Testing mit echten Nutzern
- ✅ Load-Testing des Backends (100+ concurrent users)

**Deployment:**
- 📦 Docker Hub Image Publishing
- 🚀 Kubernetes-Deployment für Skalierung (optional)
- 📊 Monitoring mit Prometheus/Grafana (optional)

**Was zeigen:**
- Mockup: Sound-Wellenform
- Mockup: Finale Pixel-Art
- Roadmap-Timeline bis Abschlusspräsentation

**Key Points:**
- ✅ Solide Basis vorhanden
- ✅ Klare Features für Phase 3
- ✅ Hardware-Testing läuft
- ✅ Production-ready bis Abgabe

---

### **FOLIE 12: Fazit & Danke**

**Script:**
> **"Zusammenfassend haben wir ein voll funktionsfähiges industrielles Pac-Man-Spiel entwickelt, das auf Arcade-Hardware läuft."**

> **"Wir haben alle Phase 2 Anforderungen erfüllt und bereits den Großteil von Phase 3 implementiert."**

> **"Das Spiel ist spielbereit, technisch solide und thematisch eng mit ifm statmath Produkten verzahnt."**

> **"Vielen Dank für eure Aufmerksamkeit! Wir freuen uns auf eure Fragen."**

**Was zeigen:**
- Zusammenfassung Key Achievements
- Team-Foto (optional)
- GitHub Repository Link
- Demo-Video Link (als Backup)

**Key Points:**
- ✅ Phase 2: 100% erfüllt
- ✅ Phase 3: 80% bereits fertig
- ✅ Hardware-ready
- ✅ Production-ready

---

---

## ❓ Mögliche Fragen & Antworten

### **TECHNISCHE FRAGEN**

#### **Q1: "Warum habt ihr Angular statt React gewählt?"**

**Antwort:**
> "Angular bietet ein vollständiges Framework mit TypeScript-Integration, Dependency Injection und einem strukturierten Ansatz. Für ein Canvas-Game ist die Wahl des Frameworks weniger relevant als bei einer typischen Web-App, aber Angular's CLI und Struktur haben uns bei der Organisation geholfen. Außerdem hat einer von uns bereits Angular-Erfahrung."

---

#### **Q2: "Wie funktioniert die Gamepad-Integration genau?"**

**Antwort:**
> "Wir nutzen die native Gamepad API des Browsers. Mit `navigator.getGamepads()` fragen wir in jedem Frame den Gamepad-Status ab. Die Achsen-Werte (axes) geben uns die Richtung, Buttons geben uns Actions. Das funktioniert mit jedem HID-kompatiblen USB-Controller ohne zusätzliche Treiber."

**Code zeigen:**
```typescript
const gamepad = navigator.getGamepads()[0];
if (gamepad) {
  const x = gamepad.axes[0]; // -1 = links, +1 = rechts
  const y = gamepad.axes[1]; // -1 = oben, +1 = unten
  if (x < -0.5) this.bufferedDirection = 'L';
  else if (x > 0.5) this.bufferedDirection = 'R';
  // ...
}
```

---

#### **Q3: "Warum SQLite und nicht direkt PostgreSQL?"**

**Antwort:**
> "Für den Arcade-Automaten ist SQLite einfacher - keine separate Datenbank-Service, nur eine Datei. Für Production/Messestand können wir einfach auf PostgreSQL wechseln, da wir Entity Framework Core nutzen. Der Connection-String ist das Einzige, was sich ändert. SQLite ist perfekt für single-instance Deployments."

---

#### **Q4: "Wie habt ihr die Performance auf dem Raspberry Pi sichergestellt?"**

**Antwort:**
> "Drei Hauptmaßnahmen: 1) Wir haben shadowBlur-Effekte entfernt, die sehr CPU-intensiv sind. 2) Wir rendern mit 30 FPS statt 60 - das reicht für Pac-Man-Gameplay. 3) Wir nutzen Chromium mit Hardware-Beschleunigung (GPU-Rasterization aktiviert). Im Testing auf dem Pi 4 haben wir konstante 30 FPS."

---

#### **Q5: "Warum Docker und nicht einfach native Installation?"**

**Antwort:**
> "Docker gibt uns Reproduzierbarkeit. Das gleiche Setup läuft auf Development-PC, auf dem Pi und potentiell in der Cloud. Mit `docker-compose up -d` ist alles startklar. Außerdem isolieren wir Dependencies - .NET, Node, PostgreSQL - alles in eigenen Containern. Das macht Deployment und Updates viel einfacher."

---

#### **Q6: "Was passiert, wenn der Raspberry Pi abstürzt?"**

**Antwort:**
> "Wir haben mehrere Sicherheitsnetze: 1) Docker-Services haben `restart: always` - starten automatisch nach Crash. 2) Autostart-Script startet das Spiel nach Reboot. 3) SQLite-Datenbank ist File-based, kein Datenverlust. 4) Wir haben ein komplettes SD-Card Backup für schnelles Recovery."

---

### **KONZEPTIONELLE FRAGEN**

#### **Q7: "Wie habt ihr den thematischen Bezug zu ifm statmath hergestellt?"**

**Antwort:**
> "Wir haben zwei Hauptverbindungen: Erstens, s.FOX optimiert Produktionspläne - unser Labyrinth repräsentiert einen Produktionsplan, jeder Auftrag ist ein optimierter Task. Der Streak-Bonus belohnt effizientes Arbeiten. Zweitens, moneo IAIA erkennt Anomalien - unsere Sensoren sind fehlerhafte Komponenten, die erkannt und behoben werden müssen. Das Power-Up ist quasi die KI-gestützte Optimierung."

---

#### **Q8: "Warum Pac-Man als Basis? Ist das nicht zu simpel?"**

**Antwort:**
> "Pac-Man ist deswegen perfekt, weil: 1) Es ist ein Arcade-Klassiker, der sofort erkennbar ist. 2) Die Mechanik ist einfach zu lernen, schwer zu meistern - perfekt für kurze Spielsessions. 3) Es lässt sich hervorragend auf Industrie übertragen (AGV sammelt Aufträge). 4) Die Technologie dahinter ist komplex - Gegner-KI, Pathfinding, State-Management - trotz simpler Grafik."

---

#### **Q9: "Wie lange dauert eine typische Spielsession?"**

**Antwort:**
> "Eine einzelne Runde dauert 2-5 Minuten, abhängig vom Skill-Level. Das ist ideal für Wartezeiten bei Model-Training oder Produktionsberechnung. Ein komplettes Level dauert etwa 1-2 Minuten. Nach 3 Leben ist Game Over, aber man kann sofort neu starten. Der Highscore motiviert zu mehreren Versuchen."

---

#### **Q10: "Könnte man das Spiel in echte ifm Produkte integrieren?"**

**Antwort:**
> "Absolut! Das war ja das Ziel. Technisch könnte man es als iframe in s.FOX oder moneo einbetten. Es ist ein reines Web-App - läuft in jedem Browser. Für echte Integration bräuchte man noch: 1) SSO-Integration (Single Sign-On), 2) Firmen-Branding (Farben, Logos), 3) Datenschutz-Compliance (DSGVO). Aber die Basis ist production-ready."

---

### **PROJEKTMANAGEMENT-FRAGEN**

#### **Q11: "Wie habt ihr die Aufgaben im Team aufgeteilt?"**

**Antwort:**
> "Wir haben nach Komponenten aufgeteilt: Person A hat das Frontend (Angular, Canvas, Game-Engine) übernommen. Person B das Backend (ASP.NET, SignalR, Datenbank). Person C die Infrastruktur (Docker, Raspberry Pi Setup). Person D UI/UX und Testing. Git-Branches haben uns geholfen, parallel zu arbeiten - Pull Requests für Code-Reviews."

*(Anpassen an euer echtes Team)*

---

#### **Q12: "Was war die größte technische Herausforderung?"**

**Antwort:**
> "Die größte Challenge war das Input-Handling. Im Grid-System muss man exakt im richtigen Moment die Richtung ändern, sonst läuft man gegen eine Wand. Unsere Lösung war Input-Buffering: Wir speichern den nächsten Input und prüfen in jedem Frame, ob die Bewegung möglich ist. Das hat das Gameplay massiv verbessert."

---

#### **Q13: "Wie viele Stunden habt ihr investiert?"**

**Antwort:**
> "Geschätzt 80-100 Stunden pro Person über 3 Wochen. Phase 1 (Konzept) ~10h, Phase 2 (Prototyp) ~40h, zusätzliche Phase 3 Features ~30h, Testing & Deployment ~20h. Die meiste Zeit ging in die Game-Engine und Gegner-KI. Docker-Setup war überraschend schnell dank guter Dokumentation."

---

#### **Q14: "Habt ihr Tests geschrieben?"**

**Antwort:**
> "Für Phase 2 haben wir uns auf manuelles Testing konzentriert - das Spiel ist sehr visuell und interaktiv, Unit-Tests für Canvas-Rendering sind schwierig. Wir haben aber: 1) Backend-API mit Swagger getestet, 2) E2E-Tests im Browser gemacht, 3) Performance-Profiling mit Chrome DevTools. Für Phase 3 könnten wir Playwright für automatisierte E2E-Tests ergänzen."

---

### **ZUKUNFTS-FRAGEN**

#### **Q15: "Was kommt nach Phase 3?"**

**Antwort:**
> "Nach Abschlusspräsentation haben wir einige Ideen: 1) Mehrere Spielmodi (Endless, Time-Attack, Multiplayer), 2) Achievement-System, 3) Saisonale Themes (Weihnachten, Ostern), 4) das Spielfür 02 spielbar zu machen, 5) Integration in echte ifm Produkte. Das Spiel ist so strukturiert, dass es erweiterbar ist."

---

#### **Q16: "Könnte man daraus ein kommerzielles Produkt machen?"**

**Antwort:**
> "Technisch ja - alle Lizenzen (MIT, Apache-2.0) erlauben kommerzielle Nutzung. Rechtlich wäre die Herausforderung die Pac-Man-Ähnlichkeit - wir müssten sicherstellen, dass es als 'inspired by' gilt, nicht als Kopie. Unsere industrielle Adaption (AGV, Sensoren, Fabrik) hilft dabei. Als White-Label-Produkt für andere Firmen wäre es machbar."

---

#### **Q17: "Plant ihr, das Open-Source zu veröffentlichen?"**

**Antwort:**
> "Das ist noch offen. Aktuell ist es in einem privaten GitHub-Repository für das Projekt. Nach Abschluss könnten wir es unter MIT-Lizenz veröffentlichen - als Lernressource für andere Students oder als Demo-Projekt. Das würde auch gut in ein Portfolio passen. Wir müssen nur klären, ob ifm statmath Einwände hat."

---

### **KRITISCHE FRAGEN**

#### **Q18: "Ist das nicht zu ähnlich zu Pac-Man? Wo ist die Innovation?"**

**Antwort:**
> "Die Innovation liegt nicht in der Mechanik, sondern in: 1) Der industriellen Adaption und thematischen Integration, 2) Der modernen Tech-Stack (Web-basiert, dockerisiert), 3) Der Echtzeit-Leaderboard-Integration, 4) Der Arcade-Hardware-Optimierung für Messestände. Außerdem war das Ziel ein Gamification-Projekt für Wartezeiten - da ist bekanntes Gameplay ein Feature, kein Bug. User müssen nicht erst lernen, wie man spielt."

---

#### **Q19: "Warum keine komplett neuen Grafiken? Die Sprites sind sehr basic."**

**Antwort:**
> "Phase 2 fokussiert auf Funktionalität, nicht auf Grafik. Die Placeholder-Sprites (farbige Kreise/Rechtecke) erfüllen ihren Zweck für Testing und Demo. In Phase 3 kommen finale Pixel-Art Assets. Außerdem hat der Retro-Style auch einen gewissen Charme - er passt zur Arcade-Ästhetik. Wir wollten nicht Zeit in Grafik investieren, bevor das Gameplay stimmt."

---

#### **Q20: "Was, wenn das Spiel auf dem Arcade-Automaten nicht läuft?"**

**Antwort:**
> "Wir haben mehrere Backup-Pläne: Plan A ist der Arcade-Cabinet mit Raspberry Pi. Plan B ist ein Laptop mit USB-Gamepad - funktional identisch. Plan C ist Laptop mit Keyboard-Steuerung. Das Spiel ist Web-basiert, läuft also überall. Wir haben außerdem ein Video-Recording als letztes Backup. Die Wahrscheinlichkeit eines Totalausfalls ist sehr gering."

---

## 🎯 Präsentations-Tipps

### **Vor der Präsentation:**
- [ ] Alle Slides nochmal durchgehen
- [ ] Demo 2-3 Mal durchspielen (Timing!)
- [ ] Gamepad testen
- [ ] Backend starten und warmhalten
- [ ] Backup-Plan parat haben (Video, Laptop)
- [ ] Timer stellen (10-15 Min Limit)

### **Während der Präsentation:**
- ✅ Langsam und deutlich sprechen
- ✅ Blickkontakt mit Publikum
- ✅ Begeisterung zeigen
- ✅ Bei Fragen: Kurz nachdenken, dann antworten
- ✅ "Gute Frage!" sagen, wenn jemand etwas Kluges fragt
- ✅ Ehrlich sein, wenn man etwas nicht weiß

### **Nach der Präsentation:**
- [ ] Feedback notieren
- [ ] Fragen aufschreiben, die ihr nicht beantworten konntet
- [ ] Danke an Prüfer sagen

---

## 📝 Checkliste am Präsentationstag

### **30 Minuten vorher:**
- [ ] Laptop/Pi booten
- [ ] Docker-Services starten: `docker-compose up -d`
- [ ] Backend-Status prüfen: `curl http://localhost:5187/api/scores/leaderboard`
- [ ] Frontend öffnen: `http://localhost` oder `http://192.168.x.x`
- [ ] Gamepad anschließen und testen
- [ ] Slides öffnen
- [ ] Backup-Video bereithalten
- [ ] Tief durchatmen 😊

### **Direkt vor Start:**
- [ ] Fenster schließen, die nicht gebraucht werden
- [ ] Browser im Fullscreen (F11)
- [ ] Lautstärke checken (falls Sounds)
- [ ] Handy lautlos
- [ ] Wasser griffbereit

---

## 🎉 Viel Erfolg!

**Ihr habt ein großartiges Projekt gebaut. Zeigt es mit Stolz!**

Die Präsentation ist nicht nur eine Prüfung, sondern auch eine Chance zu zeigen, was ihr gelernt habt. Seid selbstbewusst, seid vorbereitet, und genießt die Demo!

**Remember:**
- ✅ Ihr habt alle Phase 2 Requirements erfüllt
- ✅ Das Spiel funktioniert
- ✅ Die Technologie ist solide
- ✅ Der thematische Bezug ist klar

**Go break a leg! 🚀🎮**

---

**Erstellt:** 08.12.2025  
**Präsentationstermin:** 12.12.2025  
**Projektname:** Production Runner  
**Team:** ifm statmath Gamification
