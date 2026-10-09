# Fluxini — Houdini heute neu gedacht

Produkt- und Architekturkonzept für ein eigenständiges Produkt mit kleinem Team. Überarbeitet: 26. September 2026; externe Grundrecherche: 24. September 2026.

**Kernthese:** Künstlerische Absicht wird zu verständlichen, editierbaren prozeduralen Verfahren.

**Festgelegt am 26.09.2026:** Windows PC zuerst. Der eigene Flux Mem Layer aus D:/OMMAX bildet die Grundlage für Gedächtnis und Kontext; die KI-Ausführung wird ebenfalls selbst kontrolliert. LangChain und LangGraph sind keine Abhängigkeiten des Konzepts. Die Desktop-Adaption ist geplant, noch nicht implementiert.

Recherchierte Eigenschaften sind unmittelbar verlinkt. Produktentscheidungen, Zeitpläne, Budgets und Zielwerte sind eigene Vorschläge bzw. ausdrücklich benannte Annahmen.

## 1. Leitentscheidung

**Fluxini wird ein prozedurales 3D-Studio, in dem Sprache, direkte Bearbeitung und Nodes auf demselben nachvollziehbaren Modell arbeiten.** Das erste Produkt richtet sich an kleine Game- und Visualisierungsstudios, die Umgebungen und wiederverwendbare Assets erstellen.

Die entscheidende Neuerung ist die Übersetzung einer gestalterischen Absicht in ein editierbares Verfahren: „Verteile Felsen auf steilen Flächen und halte den Weg frei“ erzeugt ein nachvollziehbares Netzwerk mit sichtbaren Parametern, Masken und Abhängigkeiten.

Rahmen: eigenständiges Produkt, kleines Team, Windows-11-PCs zuerst. Installation, Projekte, Szenenberechnung und persistentes Flux-Gedächtnis werden für den lokalen Rechner ausgelegt; Cloud-Modelle und spätere Synchronisation sind optionale Ergänzungen. Der Name Fluxini ist ein Arbeitstitel; Marken- und Domainprüfung stehen vor einer Veröffentlichung. Dieses Konzept ist unabhängig von SideFX.

**Empfehlung:** fünf Kernrollen, ein durchgängiger Prototyp in etwa drei Monaten und ein eng begrenztes erstes verkäufliches Produkt nach etwa neun bis zwölf Monaten. Das sind Planungsannahmen für erfahrene Entwickler, keine Zusage für eine vollständige Houdini-Alternative.

---

## 2. Was die Recherche verändert

Houdini hat bereits native ML-Werkzeuge, unter anderem für Deformationen und Pyro-Auflösung. Copernicus verbindet GPU-Bildverarbeitung mit ONNX-basierten Filtern. „Nodes plus KI“ allein ist daher keine tragfähige Differenzierung. Die Chance liegt nach meiner Einschätzung in leichterer Bedienung, verständlichen Änderungen und schnellerer Überarbeitung. [SideFX: Houdini 21](https://www.sidefx.com/community/houdini-21-keynote/) · [Copernicus](https://www.sidefx.com/products/houdini/lookdev/copernicus/)

Blender besitzt ebenfalls einen Geometry-Node-Editor. Ein neuer Anbieter muss deshalb an echten Aufgaben zeigen, dass sein Ablauf Zeit spart und Ergebnisse überarbeitet werden können. Diese Produktfolgerung ist eine Bewertung, keine aus den Quellen abgeleitete Marktprognose. [Blender: Geometry Node Editor](https://docs.blender.org/manual/en/latest/editors/geometry_node.html)

OpenUSD unterstützt Szenenzusammenstellung, Referenzen und nichtdestruktive Überschreibungen; MaterialX beschreibt Materialien und deren Beziehungen. Diese Standards übernehmen wichtige Austauschaufgaben. Ein eigener prozeduraler Ausführungsgraph bleibt dennoch nötig. [OpenUSD](https://openusd.org/release/intro.html) · [MaterialX](https://materialx.org/)

Aktuelle 3D-Generierung lässt sich ergänzen, hat aber operative Grenzen: Das TRELLIS.2-Repository nennt Linux als getestete Plattform und mindestens 24 GB NVIDIA-GPU-Speicher. Ich würde solche Modelle als optionale Dienste anbinden. Ein daraus erzeugtes Mesh erhält dadurch noch keine ursprüngliche prozedurale Entstehungsgeschichte. [Microsoft TRELLIS.2](https://github.com/microsoft/TRELLIS.2)

Grundrecherche: 24.09.2026. Ergänzung vom 26.09.2026: lokale Quellcodeprüfung von D:/OMMAX, insbesondere packages/mem-layer und den eigenen strukturierten KI-Aufrufen. Die Flux-Befunde in Kapitel 16–17 beruhen auf gelesenen Implementierungen und vorhandenen Tests; diese Tests, Live-Datenbanken und Modellaufrufe wurden für die Konzeptänderung nicht ausgeführt. Grundlage der externen Aussagen sind offizielle Dokumentationen und Hersteller-Repositories. Die genannten Frameworks wurden für dieses Konzept nicht gemeinsam implementiert oder auf Zielhardware vermessen. „dev“, „latest“ und Repository-Hauptzweige sind bewegliche Quellen; vor Implementierungsbeginn werden konkrete Releases fixiert.

---

## 3. Erster Markt und konkreter Ablauf

**Erster Anwendungsfall: kleine, parametrisierbare 3D-Umgebungen.** Terrain, Wege, Felsen, Vegetationsverteilung und modulare Bauteile sind visuell verständlich und lassen sich mit einer begrenzten Operatorbibliothek kombinieren. Wiederkehrende Varianten schaffen einen plausiblen Grund, ein eigenes Werkzeug zu nutzen.

Beispiel: Eine Artistin importiert fünf Felsmodelle und zeichnet einen Weg. Sie schreibt: „Erstelle einen felsigen Hang, entlang des Weges zwei Meter Abstand, oben weniger Vegetation.“

1. Die Anwendung erkennt Auswahl, Maßeinheit und verfügbare Assets.
2. Die KI kombiniert eine Terrain-Vorlage mit Höhen- und Neigungsmasken sowie einer Distanzmaske zum Weg.
3. Das System prüft den Graphen und berechnet eine reduzierte Vorschau.
4. Die Artistin sieht Ergebnis und Änderungen; Regler für Dichte, Höhe und Abstand bleiben direkt zugänglich.
5. „Nur links dichter, große Felsen beibehalten“ verändert den ausgewählten Teil. Gesperrte Parameter und stabile Instanz-IDs schützen vorhandene Gestaltung.
6. Das Ergebnis wird als Szene oder gebackene Geometrie exportiert. Das native Projekt behält alle Nodes.

Der Exportumfang wird explizit beschrieben: ein übertragenes Mesh ist ein berechnetes Ergebnis; Fluxini-Nodes werden nicht automatisch zu Blender- oder Houdini-Nodes.

**Zu validierende Nachfrage:** zehn bis fünfzehn Interviews, fünf Studios als Entwicklungspartner, drei wiederkehrende Aufgaben. Maßstab ist die Zeit bis zu einem akzeptierten und anschließend geänderten Ergebnis. Ein beeindruckender Erstentwurf genügt nicht.

---

## 4. Bedienung und Umfang der ersten Version

Die Oberfläche hat einen großen Viewport, einen kontextbezogenen Parameterbereich und einen einblendbaren Node-Editor. Ein KI-Eingabefeld arbeitet mit der aktuellen Auswahl. Der Graph bleibt jederzeit zugänglich, muss aber beim Einstieg nicht vollständig sichtbar sein.

Ein Klick im Viewport identifiziert möglichst den erzeugenden Operator und dessen Parameter. Jede Vorschau zeigt Berechnungsstatus, Qualitätsstufe und Fehler am verantwortlichen Node. Änderungen lassen sich als zusammengehöriger Schritt rückgängig machen; Varianten werden als Projektzweige gespeichert.

**Im ersten Produkt:** etwa 25–35 sorgfältig ausgewählte Operatoren für Primitive, Transformation, Kurven, Heightfields, Noise, Masken, Verteilung, Instanzen, Attribute, einfache Materialien, Import und Export; dazu wenige gute Vorlagen, Undo/Redo, Autosave, Cache und KI-Änderungen.

Eine minimale Timeline erlaubt Parameteranimation. Simulationen mit zeitabhängigem Zustand erhalten erst in einer späteren Phase eine eigene Ausführungslogik.

**Spätere Ausbaustufen:** Partikel und einfache Dynamik; Volumen und spezialisierte Solver; prozedurale Materialbearbeitung; Team-Bibliotheken; externe Job-Ausführung. Filmreife FLIP-/Pyro-Solver, komplettes Character-Rigging, ein eigener Offline-Renderer und simultanes gemeinsames Editieren gehören nicht zum ersten Entwicklungsbudget.

---

## 5. Empfohlener Stack und Alternativen

**Desktop: Tauri 2, React, TypeScript und Vite.** React eignet sich für die komplexe Editoroberfläche; Tauri verbindet sie mit einem Rust-Kern. Der Nutzen ist schnelle UI-Entwicklung bei lokalem Dateizugriff. Tauri nutzt die WebViews des Betriebssystems; deren Unterschiede müssen im technischen Vorversuch geprüft werden. Windows zuerst begrenzt diese Testmatrix. [Tauri-Prozessmodell](https://v2.tauri.app/concept/process-model/)

**Node-Editor: React Flow.** Auswahl, Verbindungen und benutzerdefinierte Nodes bilden eine gute Ausgangsbasis. Die Ausführung liegt in der eigenen Engine. Große Graphen verlangen selektive Zustandsabonnements, zusammenklappbare Teilgraphen und Messungen; zehntausend gleichzeitig aufwendig dargestellte Nodes sind kein zugesicherter Standardfall. [React Flow](https://reactflow.dev/) · [Performance](https://reactflow.dev/learn/advanced-use/performance)

**Viewport: Three.js mit WebGPURenderer.** Für Vorschau, Picking, Instanzen und einfache PBR-Materialien ist dies ein Kandidat mit geringem Anfangsaufwand. Die Dokumentation beschreibt WebGPU mit WebGL-2-Fallback, bezeichnet den Renderer aber weiterhin als experimentell. Compute-Funktionen müssen gesondert geprüft werden; der Rendering-Fallback garantiert keine gleichwertige GPU-Berechnung. [Three.js](https://threejs.org/manual/pages/webgpurenderer)

**Engine: Rust, zunächst CPU-Ausführung.** Ein vom Fenster unabhängiger Bibliothekskern hält Graph, Attribute, Cache und Änderungsjournal; eine CLI verwendet denselben Kern. Rust ist eine Architekturentscheidung zur Begrenzung von Speicherfehlern und zur Parallelisierung. Robuste Geometriealgorithmen entstehen dadurch nicht automatisch.

**Gezielte GPU-Erweiterung: wgpu/WGSL nach Profiling.** wgpu unterstützt native Grafik- und Compute-Backends über unter anderem Vulkan, Metal und DirectX 12. Wir beschleunigen ausgewählte Operatoren, sobald eine Messung die Datenübertragung rechtfertigt. Native wgpu-Buffers und der Three.js-Viewport teilen nicht automatisch GPU-Speicher. [wgpu](https://wgpu.rs/)

**KI und Gedächtnis: Flux Mem Layer plus eigene Ausführungslogik.** Aus dem vorhandenen TypeScript-Paket werden Kontextaufbau, Budgetierung, Retrieval und bestätigte Präferenzen für Fluxini adaptiert. Ein kleiner eigener Zustandsautomat steuert Planen, Validieren, Vorschau und Übernahme. Der vorhandene strukturierte Modellaufruf ist ein Wiederverwendungskandidat; ein Provider-SDK darf als austauschbarer Transport dienen. Die Speicher- und Szenenadapter sind neue Arbeit. [Flux-Assembler](D:/OMMAX/packages/mem-layer/src/assembler.ts:147) · [Eigene strukturierte Aufrufe](D:/OMMAX/apps/web/src/lib/structured-call.ts:174)

**Speicherung:** lesbares, versioniertes Graph-Manifest, getrennte binäre Assets und Caches sowie lokale SQLite-Datenbanken. Der Rust-Kern besitzt Projektjournal und ausstehende Ereignisse; der Flux-Prozess besitzt sein Gedächtnis und dessen Suchindizes. Je Datenbank gibt es einen verantwortlichen Writer. Die aktuelle PostgreSQL-Implementierung wird über einen neu zu entwickelnden fachlichen Speicheradapter entkoppelt. Wiederherstellung und lokale Erinnerung dürfen nicht von einem Cloud-Konto abhängen.

**Alternativen:** Qt 6 mit C++ ist die stärkere Ausgangsoption, wenn das Team bereits native DCC-/Rendering-Erfahrung besitzt oder ein anspruchsvoller nativer Viewport von Tag eins an erforderlich ist. Qt Quick 3D integriert 2D- und 3D-Inhalte, liefert aber ebenso wenig den prozeduralen Produktkern fertig mit. Electron ist als UI-Hülle prüfenswert, wenn die System-WebViews den Vorversuch nicht bestehen. Ein vorhandener Game-Engine-Stack ist nur dann vorzuziehen, wenn seine Nutzung messbar Entwicklungsarbeit spart. [Qt Quick 3D](https://doc.qt.io/qt-6/qtquick3d-index.html)

Meine Wahl gilt für ein Team mit Web- und Rust-Kompetenz. Diese Teamannahme ist vor einer endgültigen Festlegung zu prüfen.

---

## 6. Die Architektur: ein Modell, mehrere Zugänge

Der Datenfluss lautet:

**Maus / Regler / Sprache → gemeinsame Command-API → geprüfte Graph-Änderung → versionierter Projektgraph → Scheduler und Cache → Geometrie / Instanzen → Viewport und Export.**

Die KI ist ein weiterer Client dieser API. Flux stellt ihren Kontext zusammen: ausgewählte Szene, verbindliche Regeln, bestätigte Präferenzen, passende Rezepte und relevante Projektgeschichte. Das autoritative Projektmodell liegt im Rust-Kern. Ein erinnerter Wert wird niemals ungeprüft als aktueller Szenenwert verwendet.

**KI-Pfad:** Nutzerabsicht + aktueller Szenenausschnitt → Flux-Kontextpaket → eigener Planer → validierter Patch → Rust-Engine → bestätigtes Ergebnis → Flux-Ereignis. Der Wissensgraph von Flux, der prozedurale Geometriegraph und der Ablauf eines KI-Auftrags erfüllen unterschiedliche Aufgaben.

Drei Modelle bleiben ausdrücklich getrennt:

- **Authoring-Graph:** was der Mensch oder die KI angeordnet hat, einschließlich Gruppen, Parametern, Herkunft und UI-Anordnung.
- **Ausführungsdarstellung:** normalisierte Operatoren, Abhängigkeiten, Datenlayouts und CPU-/GPU-Zuordnung. Diese Darstellung darf optimiert werden, ohne die lesbare Node-Struktur zu zerstören.
- **Szenenmodell:** Objekte, Transformationshierarchie, Instanzen, Materialien und Asset-Referenzen für Viewport und Export.

Eine Intermediate Representation, kurz IR, ist hier zunächst ein klar definiertes internes Datenmodell. Ein eigener universeller Compiler oder eine neue Sprache wären zusätzliche Projekte.

**Prozessgrenzen:** Der Desktop-Prozess verwaltet Dateien und geprüfte Befehle. Flux bleibt zunächst TypeScript und läuft mit einer mitgelieferten Node-Laufzeit als lokaler Begleitprozess. Rust kontrolliert dessen Start, Ende und erlaubte Engine-Befehle; versionierte Nachrichten laufen über stdin/stdout. Der Nutzer benötigt keine separate Node-Installation. Der Packaging-Test gehört in den ersten Vorversuch. Eingebaute Geometrieoperatoren laufen im Rust-Kern; spätere Python-/C++-Erweiterungen erhalten eigene Worker. Prozessisolation allein ist noch keine Sicherheits-Sandbox. [Tauri: externe Binaries](https://v2.tauri.app/develop/sidecar/)

**Datenübertragung:** kleine Befehle als strukturierte Nachrichten, Geometrie als binäre Blöcke und Instanzänderungen. Es werden weder pro Frame alle Vertices als JSON verschickt noch Shared-Memory- oder Zero-Copy-Eigenschaften behauptet, die nicht implementiert sind. Tauri dokumentiert binäre Antworten und Channels; das konkrete Transportverhalten muss vermessen werden. [Tauri-IPC](https://v2.tauri.app/develop/calling-rust/)

Zum Vergleich: eine Million Positionen mit drei 32-Bit-Werten sind schon 12 MB. 30 vollständige Übertragungen pro Sekunde ergeben 360 MB/s allein für Positionen, ohne Normalen, Indizes oder Kopieraufwand. Deshalb braucht der MVP Instanzen, begrenzte Vorschaudaten und inkrementelle Updates.

Der Vorversuch entscheidet, ob diese Architektur für die Zielszene genügt. Falls nicht, werden zuerst Datenmenge und Kopien reduziert; ein nativer Viewport wäre eine ausdrückliche Architekturänderung mit neuem Aufwand.

---

## 7. Was den prozeduralen Kern ausmacht

**Typisierte Anschlüsse:** Mesh, Kurve, Punktmenge, Heightfield, Instanzmenge, Skalar, Vektor und Material erhalten eindeutige Schnittstellen. Attribute tragen Typ, Besitzerbereich, Einheit und Koordinatenraum. Implizite Konvertierungen werden bewusst begrenzt.

**Datenlayout:** getrennte, zusammenhängende Attributarrays; unveränderliche Ergebnis-Handles; stabile Objekt- und Instanz-IDs, wo die Operation sie erhalten kann. Bei Topologieänderungen wird der Verlust einer Zuordnung explizit behandelt. Die Darstellung muss künftig große Datenmengen unterstützen, ohne jedes Element zu einem UI-Objekt zu machen.

**Abhängigkeiten:** eine Parameteränderung invalidiert nur betroffene Ergebnisse. Verschieben eines Nodes im Editor löst keine Geometrieberechnung aus. Abgebrochene oder überholte Jobs dürfen eine neuere Vorschau nicht ersetzen.

**Cache-Schlüssel:** Operator und Version, Parameter, Eingabe-Hashes, Asset-Versionen, Seed, Zeit, Qualitätsstufe und gegebenenfalls Backend/Präzision. Änderungen an einem externen Asset müssen den zugehörigen Cache ungültig machen.

**Zeit:** statische Geometrie kann als azyklischer Datenfluss ausgeführt werden. Simulationen brauchen explizite Zustandsknoten, Zeitschritt, Substeps und Checkpoints. Ein Rücksprung auf Frame 20 stellt einen gültigen Zustand her und simuliert erforderliche Schritte erneut. Ein beliebiger Zyklus im Node-Editor ersetzt diese Semantik nicht.

**Nachvollziehbarkeit:** deterministische Seeds und fixierte Abhängigkeiten unterstützen Wiederholbarkeit. Bitidentische Ergebnisse über unterschiedliche GPUs und Treiber hinweg werden nicht pauschal versprochen. Simulationen erhalten Fehlertoleranzen, Referenzszenen und eingefrorene Caches.

**Langfristig:** ein Subgraph wird zu einem wiederverwendbaren, versionierten Asset mit eigener Oberfläche. Diese Kombination aus guter Operatorbibliothek, Vorlagen, Diagnostik und überprüfbaren KI-Änderungen ist der eigentliche Produktwert.

---

## 8. Standards, Simulation und Rendering ausbauen

**OpenUSD für Szenenaustausch und spätere Szenenkomposition.** Native Projekte behalten ihre Graphen separat. USD übernimmt den Austausch berechneter Geometrie und Szenenstrukturen; es ist kein fertiger Houdini-SOP-Scheduler. In der ersten Version genügt ein definierter Exportumfang. Ein USD-/MaterialX-Roundtrip mit beliebigen Anwendungen wird nicht zugesagt. [OpenUSD](https://openusd.org/release/intro.html)

**MaterialX für Materialaustausch.** Zuerst unterstützt Fluxini einen klar beschriebenen PBR-Teilumfang. Zwischen dessen Darstellung im Viewport und komplexen MaterialX-Netzen braucht es eine geprüfte Abbildung. Dass MaterialX WGSL-Generierung unterstützt, macht es noch nicht zu einer sofort fertigen Three.js-Integration. [MaterialX](https://materialx.org/)

**OpenVDB für spätere sparse Volumen.** NanoVDB eignet sich als kompakte CPU-/GPU-freundliche Volumenrepräsentation, besitzt aber Einschränkungen bei veränderlicher Topologie. Keine dieser Datenstrukturen liefert allein einen produktionsreifen Fluid-Solver. [OpenVDB](https://www.openvdb.org/) · [NanoVDB FAQ](https://www.openvdb.org/documentation/doxygen/NanoVDB_FAQ.html)

**NVIDIA Warp für ausgewählte Simulationen und differenzierbare Berechnungen.** Es kompiliert Python-Kernel für CPU und NVIDIA-CUDA-Ausführung. Der dokumentierte macOS-Pfad bietet CPU-Ausführung, keine Metal-Beschleunigung. Deshalb bleibt Warp ein optionales Backend mit sichtbaren Hardwareanforderungen. [NVIDIA Warp](https://github.com/NVIDIA/warp)

**Slang als spätere Shader-/Compute-Option.** Die Sprache bietet mehrere Zielplattformen und automatische Differentiation. Ihr Nutzen muss für konkrete Kernel samt Toolchain geprüft werden. Sie ersetzt weder den Operatorenkatalog noch sämtliche geometrischen Algorithmen. [Slang](https://shader-slang.org/)

**Rendering:** im MVP gute interaktive Vorschau und Export; für hochwertige Endbilder zunächst vorhandene Renderer über geprüfte Austauschwege nutzen. Hydra wird relevant, wenn das Produkt eine umfassende USD-/Renderer-Integration braucht. Hydra ist eine Rendering-Architektur und kein automatisch mitgelieferter vollständiger Produktionsrenderer. [Hydra](https://openusd.org/dev/api/_page__hydra__getting__started__guide.html)

Diese Komponenten werden stufenweise eingeführt. C++, Python, Slang, native GPU-Interop und eine Cloud-Jobplattform gleichzeitig in Version eins würden die Wartung für fünf Personen überlasten.

---

## 9. KI-Funktionen nach Nutzen und Reife

**Priorität 1: Erklären und lokal verändern.** „Warum sind hier keine Bäume?“ wird anhand der tatsächlichen Masken und Zwischenwerte beantwortet. „Verdopple nur dort die Dichte“ wird in eine kleine Änderung übersetzt. Diese eng umrissenen Aufgaben lassen sich vergleichsweise gut überprüfen.

**Priorität 2: aus Vorlagen aufbauen.** Das Modell findet passende, von Artists erprobte Subgraphen, verbindet sie und setzt Parameter. Es erhält die Dokumentation genau der installierten Operatorversion. Zu Beginn sind wenige gute Vorlagen nützlicher als beliebige generierte Netzwerke.

**Priorität 3: Auswahl und Referenzbilder verstehen.** Das Modell kombiniert einen optionalen Viewport-Ausschnitt mit Kamera, Objekt-IDs, Auswahlmaske und Szenenstatistik. Ein Screenshot allein liefert keine verlässliche Geometrie- oder Tiefeninformation.

**Priorität 4: Varianten und Optimierung.** Für „ähnlicher zur Referenz“ schlägt die KI begrenzte Parameteränderungen vor. Messbare Ziele wie Anzahl, Abstand und Speicherbedarf werden numerisch geprüft; ästhetische Entscheidungen bleiben beim Artist. Differenzierbare Optimierung ist für passende Teilprobleme interessant, nicht für jede diskrete Topologieoperation.

**Optional: generative Assets.** Bild-zu-3D oder Texturgenerierung erzeugt explizite Asset-Knoten mit Herkunft, Modellversion und gespeicherten Ergebnissen. Topologie, UVs, Maßstab und Nutzungsbedingungen sind Teil der Importprüfung. Der Node-Graph organisiert die weitere Bearbeitung; er rekonstruiert keine garantierte parametrische Historie aus dem Bild. [TRELLIS.2](https://github.com/microsoft/TRELLIS.2)

**Später: spezialisierte ML-Operatoren.** ONNX Runtime ist ein Kandidat für kleinere lokale Modelle etwa für Segmentierung oder Deformation. Die Execution Provider decken verschiedene Beschleuniger ab; Operator- und Modellsupport müssen pro Zielplattform getestet werden. PyTorch bleibt für Forschung und Modelle mit eigener Laufzeit relevant. [ONNX Runtime](https://onnxruntime.ai/docs/execution-providers/)

Kein eigenes Basismodell im MVP. Verschiedene bestehende Modelle werden anhand derselben realen Aufgaben verglichen. Die Wahl erfolgt nach korrekten Änderungen, Laufzeit und Kosten, nicht allein nach allgemeinen Modellrankings.

---

## 10. Der kontrollierte KI-Ablauf

**Absicht → Flux-Kontextpaket → Änderungsentwurf → Validierung → reduzierte Berechnung → Vergleich → Übernahme → bestätigtes Flux-Ereignis.**

Die KI erhält Auswahl, relevanten Teilgraphen, erlaubte Operatoren, gesperrte Bereiche und Ressourcenlimits. Ganze Produktionsszenen müssen nicht standardmäßig an einen Anbieter übertragen werden. Assets und importierte Metadaten werden als Inhalt behandelt; sie dürfen die erlaubten Werkzeuge nicht erweitern.

Die interne API bietet beispielsweise inspect_selection, search_operators, propose_patch, validate_patch, evaluate_preview, commit_patch und rollback. Die tatsächlichen Namen und Schemas werden bei der Implementierung festgelegt.

Ein Patch benennt die Ausgangsrevision, jede betroffene Node-ID und jede Parameteränderung. Beispiel: set_parameter(node_id="scatter_rocks", name="density", value=0.35). Die Übernahme erfolgt atomar und nur auf die passende Projektversion. Gleichzeitige manuelle Änderungen führen zu einem Konflikt, der erneut geplant wird.

Die Validierung prüft:

- Existieren Operator, Version, Node-ID und Anschluss?
- Stimmen Datentypen, Einheiten, Wertebereiche und Abhängigkeiten?
- Bleiben Sperren und ausgewählte Bearbeitungsbereiche erhalten?
- Passt die geschätzte Last zum festgelegten Budget?
- Liefert der Probelauf gültige, endliche Geometrie und akzeptable Szenenmetriken?

Erlaubte, reversible Parameteränderungen können entsprechend der Nutzerpräferenz direkt mit Undo angewendet werden. Größere Umbauten werden als Variante mit sichtbarem Vergleich angeboten. Die KI führt keine beliebigen Shellbefehle oder frei erzeugten Python-Skripte in der normalen Projektsitzung aus.

**Eigene Ausführungslogik:** Ein kleiner Zustandsautomat speichert Auftragsstatus, Fristen, Versuche und Referenzen auf die Ausgangsrevision. Flux ist die Gedächtnis- und Kontextschicht; es ersetzt weder diesen Ablauf noch den Geometriescheduler. Die vorhandenen strukturierten Aufrufe und Flow-Helfer aus OMMAX liefern Muster, benötigen aber Fluxini-spezifische Werkzeuge und einen Desktop-Lebenszyklus. MCP kann später dieselbe geprüfte API externen Assistenten zugänglich machen. [OMMAX-Flow-Ausführung](D:/OMMAX/apps/web/src/lib/flow/executor.ts:119) · [MCP-Architektur](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)

**Offline-Ziel:** Manuelle Bearbeitung, gespeicherte Graphen, lokale Berechnung, Ereignisgedächtnis und Stichwortsuche funktionieren ohne Netz. Das erfordert den neuen lokalen Flux-Speicheradapter. Ohne verfügbares lokales Modell ist keine KI-Generierung offline zugesichert; Cloud-KI und lokale Modelle sind getrennte Optionen. Modellkennung, Prompt-Vorlage, Werkzeugaufrufe und akzeptierter Patch werden im Änderungsverlauf gespeichert. Da eine Modellantwort nicht verlässlich reproduzierbar ist, wird das akzeptierte Ergebnis eingefroren.

---

## 11. Roadmap mit echten Entscheidungspunkten

**Wochen 1–4: Risiken und Bedarf prüfen.** Zehn bis fünfzehn Interviews; fünf Entwicklungspartner ansprechen; drei Vergleichsaufgaben definieren. Technisch: Tauri-/WebGPU-Test auf festgelegten Windows-Rechnern, binäre Datenübertragung, Instanzen, Picking und ein vertikaler Ablauf mit etwa zehn Operatoren. Parallel im selben Vorversuch: Flux-Extraktionsgrenze, lokaler Speicheradapter, Paketierung des Begleitprozesses sowie ein persistierter KI-Änderungsablauf mit Neustart. Entscheidung: bestehen Nachfrage- und Leistungshypothese?

**Monate 2–3: durchgängiger Prototyp.** Terrain → Maske → Scatter → Instanzen → Export. Etwa 12–15 Operatoren, natives Projektformat, Undo/Redo, einfache Vorlagen und erste textgesteuerte Parameteränderungen mit Flux-Kontext. Abgenommene Entscheidungen bleiben nach Neustart verfügbar; aktuelle Szenendaten werden erneut aus dem Kern gelesen. Eine Aufgabe muss vollständig vom leeren Projekt bis zum Export funktionieren.

**Monate 4–6: Alpha.** Ausbau auf etwa 25–35 Operatoren, Subgraphen, Cache, Diagnostik, robuste Projekte, eingeschränkter USD-Export und KI-Patches mit Vorschau. Fünf Entwicklungspartner arbeiten an ihren eigenen Assets.

**Monate 7–9: geschlossene Beta.** Import-/Exportmatrix, Installer, Wiederherstellung, Performance und etwa 100 gehaltene KI-Prüffälle. Wiederholte Nutzung und die Bereitschaft zu bezahlten Pilotprojekten entscheiden über die nächste Finanzierung.

**Monate 9–12: enges erstes Kaufprodukt.** Unterstützung, Dokumentation, Abrechnung optionaler KI-Nutzung und zuverlässig exportierbare Workflows. Zeitpuffer liegt in diesem Korridor. Größere Solver und plattformübergreifende Feature-Parität benötigen ein neues Budget.

Die Kalenderzeiten setzen ungefähr fünf verfügbare Kernrollen und Erfahrung in 3D-Software voraus. Einzelne Frameworks verkürzen die Grundlagenarbeit; Interoperabilität und robuste Geometry-Operationen bleiben erheblicher Eigenaufwand.

---

## 12. Team und Budget als Planungsmodell

Fünf Kernrollen: eine Person für Engine und Architektur, eine für Geometrie/Rendering, eine für UI und Interaktion, eine für KI/Integration und eine für Produkt/Technical Art. Qualitätssicherung und Distribution werden im Team verankert und bei Bedarf extern unterstützt. Rollen können kombiniert werden; fehlende Rendering- oder Geometriekompetenz ist ein größeres Risiko als die Wahl des UI-Frameworks.

Die Wiederverwendung von Flux reduziert Eigenarbeit bei Kontextmustern und Tests, bringt aber Entkopplung, lokale Persistenz und Desktop-Paketierung mit sich. Die bisherigen Zeit- und Budgetkorridore bleiben deshalb bis zum Vorversuch bestehen; ein pauschaler Einsparungsfaktor wird nicht behauptet.

**Interne Budgetannahme:** 9.000–13.000 Euro vollständige monatliche Personalkosten je Vollzeitrolle, neun bis zwölf Monate und zusätzlich 15–25 % Reserve/Sachkosten. Diese Werte sind Szenarioparameter, keine recherchierten Gehaltssätze oder Angebote.

Rechnung: 5 × 9 × 9.000 × 1,15 = 465.750 Euro am unteren Rand; 5 × 12 × 13.000 × 1,25 = 975.000 Euro am oberen Rand. Das ist eine Größenordnung von **etwa 0,47–0,98 Mio. Euro** bis zum begrenzten ersten Kaufprodukt. Vollständiger Ersatz einer etablierten VFX-Suite ist darin nicht enthalten.

Im Basisszenario mit fünf Rollen, zehn Monaten, 11.000 Euro pro Monat und 20 % Zuschlag ergibt sich 660.000 Euro. Enthalten ist eine pauschale Reserve; eigener Modellaufbau, größere Trainingsläufe und kommerzielle Fremdlizenzen benötigen eigene Angebote.

**Geschäftsmodell-Hypothese:** bezahlter Desktop-Arbeitsplatz, optional begrenztes oder nutzungsabhängig abgerechnetes Cloud-KI-Kontingent. Lokale prozedurale Bearbeitung verursacht keine obligatorischen Tokenkosten. Konkrete Preise werden erst mit bezahlten Piloten getestet. Unbegrenzte GPU-Generierung würde unkalkulierbare variable Kosten erzeugen.

Die Differenzierung wächst aus wiederverwendbaren Vorlagen, zuverlässigen Änderungen und Integration in vorhandene Arbeitsabläufe. Ein austauschbares Basismodell allein schafft wenig Schutz vor Nachahmung.

---

## 13. Prüfkriterien vor größeren Investitionen

Die folgenden Werte sind **vorgeschlagene Abnahmekriterien**, keine bereits gemessenen Ergebnisse.

**Referenzsystem für den ersten Test:** Windows 11, acht CPU-Kerne, 32 GB RAM, NVIDIA-GPU mit 12 GB VRAM. Zusätzlich wird auf einem AMD-System geprüft; die genauen Geräte und Treiberversionen werden protokolliert. Lokale große generative Modelle gehören nicht zum Basisprofil.

**Technische Prüfszenen:** ein Mesh mit einer Million Dreiecken; separat 50.000 Instanzen eines einfachen 20-Dreiecks-Assets; ein 512×512-Heightfield; ein Graph mit 2.000 Nodes und begrenzter sichtbarer Teilmenge. Die Szenen werden getrennt gemessen, später auch kombiniert.

Ziele: mindestens 30 Bilder/s bei 1080p in den definierten einfachen Vorschauszenen; p95 unter 50 ms für reine UI-Reaktion; unter 200 ms bis zur Vorschau für ausgewählte leichte Parameteränderungen. Teure Berechnungen dürfen länger brauchen, müssen abbrechbar sein und ihren Fortschritt zeigen. Shader-Kompilierung und erster Kaltstart werden getrennt erfasst.

**Projektqualität:** Speichern/Laden erhält Graph, IDs und Parameter; Autosave übersteht einen erzwungenen Abbruch; Undo stellt den vorigen Zustand wieder her; veraltete Jobs überschreiben keine aktuellen Ergebnisse. Exporttests prüfen unter anderem Maßstab, Orientierung, Normalen, Materialien und die dokumentierte Instanzabbildung.

**Flux-Abnahme:** Gedächtnis überlebt Neustarts ohne Netzwerk; ein erneut zugestelltes Ereignis wird nicht doppelt gespeichert. Fremde Projekte oder Varianten gelangen nicht in den aktiven Kontext. Unbestätigte Präferenzen bleiben draußen. Ältere Erinnerungen überschreiben keine neue Szenenrevision. Wenn verbindliche Informationen nicht ins Modellfenster passen, wird der Auftrag eingegrenzt statt diese Informationen still zu kürzen. Embedding-Ausfälle lassen Ereignisse und Stichwortsuche verfügbar.

**KI-Prüfsatz:** mindestens 100 bisher nicht verwendete Aufgaben aus Aufbau, lokalen Änderungen, Fehlerdiagnose und unerfüllbaren Anforderungen. Syntaktisch gültige Patches und gestalterisch erfolgreiche Ergebnisse werden getrennt gezählt. Startziel: mindestens 90 % ausführbare Patches und 80 % fachlich akzeptierte Ergebnisse im begrenzten Aufgabenbereich; keine Verletzung gesperrter Bereiche im Prüfsatz. Letzteres ist ein Testkriterium, keine allgemeine Fehlerfreiheitsgarantie.

**Produktnutzen:** In drei festgelegten Aufgaben inklusive Änderungsrunde soll die mediane Bearbeitungszeit bei den Entwicklungspartnern um mindestens 30 % gegenüber deren bisherigem Ablauf sinken. Aufgaben werden in wechselnder Reihenfolge bearbeitet; Ergebnisse beurteilen Artists. Ein kleiner Pilot belegt noch keine allgemeine Marktleistung.

**Kosten und Betrieb:** KI-Kosten je akzeptierter Änderung erfassen, einschließlich Fehlversuchen; Abbrüche, Zeitlimits und Nutzerbudget technisch durchsetzen. Es gibt keine pauschale Kostenannahme pro Prompt ohne Messung.

---

## 14. Größte Risiken und Reaktion darauf

**Zu viel Produkt auf einmal.** Gegenmaßnahme: eine Aufgabenfamilie und ein vollständiger Exportpfad. Weitere Domänen erst nach wiederholter Nutzung und bezahlten Piloten.

**Geometriequalität.** Frameworks lösen Randfälle bei Topologie, Attributübertragung und numerischer Stabilität nicht automatisch. Bewährte Bibliotheken gezielt integrieren, ungültige Eingaben diagnostizieren und einen Bestand an realen Problemszenen pflegen. Anspruchsvolle Booleans und Remeshing gesondert evaluieren.

**Viewport und Kopierkosten.** Vor dem großen UI-Ausbau messen. Instanzen und inkrementelle Updates priorisieren. Wenn die Architektur das vereinbarte Szenenbudget nicht schafft, den Stack oder den Zielumfang früh korrigieren.

**Unzuverlässige KI.** Kleine Patches, bekannte Vorlagen, revisionsgebundene APIs, Sperren und ein unabhängiger Validator. Probeläufe mit klaren Limits; sichtbarer Rückweg zum letzten gültigen Stand.

**Hardware- und Anbieterabhängigkeit.** Manuelle Grundfunktionen lokal verfügbar halten; optionale GPU-/Modellfunktionen mit tatsächlichen Voraussetzungen kennzeichnen. Nicht jede ONNX-, CUDA- oder WebGPU-Funktion besitzt einen gleichwertigen Ersatz.

**Austausch und Lizenzen.** Für jedes Format eine konkrete unterstützte Teilmenge definieren. Abhängigkeiten, mitgelieferte Gewichte und Inhalte vor Distribution einzeln prüfen; eine Lizenz des Hauptrepositories deckt nicht automatisch alle Unterkomponenten ab. Der TRELLIS.2- und Warp-Quelltext weist auf gesonderte Abhängigkeiten hin. [TRELLIS.2](https://github.com/microsoft/TRELLIS.2) · [Warp](https://github.com/NVIDIA/warp)

**Unklarer Kaufgrund.** Wenn Entwicklungspartner nur die erste KI-Demo interessant finden, aber Änderungen weiterhin in ihrem bisherigen Werkzeug erledigen, ist die Produktthese noch nicht bestätigt. Dann wird zuerst die Aufgabenfamilie oder der Arbeitsablauf angepasst.

---

## 15. Die erste Entwicklungsentscheidung

Als erste Demonstration empfehle ich eine **parametrische Felslandschaft mit Weg und Vegetationsmasken**. Sie zeigt die Verbindung von Sprache, räumlicher Auswahl, Regeln, Instanzen und wiederverwendbaren Varianten.

Die erste Arbeitsliste ist bewusst konkret:

1. Drei Testaufgaben und den unterstützten Szenenumfang schriftlich festlegen.
2. Einen etwa zehn Nodes umfassenden Graphen mit stabilen IDs und Save/Load ausführen.
3. Terrain, Wegdistanz und Instanzen im Viewport anzeigen.
4. Flux einen Kontext aus aktueller Auswahl, Operatorvertrag und Projektregeln zusammenstellen lassen; die KI ändert ausschließlich vorhandene Dichte-, Abstands- und Höhenparameter.
5. Änderungen visualisieren, validieren und mit einem Schritt rückgängig machen.
6. Das berechnete Ergebnis exportieren und in einem zweiten 3D-Programm überprüfen.
7. Eine Entscheidung in Flux speichern, die Anwendung neu starten und ihre korrekte projektbezogene Wiederverwendung prüfen.
8. Den vollständigen Ablauf mit drei Artists beobachten und seine Dauer messen.

Die Freigabe für den weiteren Ausbau folgt erst, wenn der Ablauf nützlich ist und der technische Vorversuch bestanden wurde. Danach wächst Fluxini entlang realer Aufgaben zu einer breiteren prozeduralen Plattform.


---

## 16. Was aus dem vorhandenen Flux-System übernommen wird

Quellstand: lokal gelesene Dateien in D:/OMMAX am 26.09.2026. Die verwendbare Implementierung liegt in **packages/mem-layer**; der Ordner Flux enthält Eingabematerial. Die folgenden Befunde beschreiben gelesenen Code, keine in dieser Aufgabe erneut gemessene Laufzeitleistung.

**Kontext mit klarer Herkunft:** assembleContext baut getrennte Bereiche für Kampagne, bindende Fakten, Marke, Regeln, bestätigte Präferenzen, Geschichte und gefundenes Wissen. Jeder Bereich kann sein eigenes Budget haben; ausgelassene Zeilen werden protokolliert. promptFacts vermeidet Wiederholungen, wenn ein aufrufender Prompt dieselben Fakten bereits enthält. Fluxini übernimmt dieses Muster mit eigenen Szenen- und Operatorverträgen. [Assembler](D:/OMMAX/packages/mem-layer/src/assembler.ts:147) · [Kontexttypen](D:/OMMAX/packages/mem-layer/src/types.ts:73) · [Budgets](D:/OMMAX/packages/mem-layer/src/budget.ts:45)

**Hybride Suche:** Der Assembler verwendet standardmäßig eine kampagnenspezifische Anfrage und hybride Suche. PostgreSQL-Vektorsuche und deutsche Volltextsuche werden über Reciprocal Rank Fusion zusammengeführt; der Assembler berechnet die Anfrage-Einbettung einmal pro Aufbau. Die allgemeine semanticSearch-Funktion verwendet ohne Option weiterhin Vektorsuche. Für Fluxini werden Aufgabenbezug und Sprach-/Code-Suche neu zugeschnitten: englische Operatornamen, Einheiten und Versionsnummern brauchen eigene Testfälle. [Assembler-Defaults](D:/OMMAX/packages/mem-layer/src/assembler.ts:67) · [Retrieval](D:/OMMAX/packages/mem-layer/src/vector.ts:260) · [RRF](D:/OMMAX/packages/mem-layer/src/rrf.ts:15)

**Abgrenzung und Präferenzen:** Ereignisse werden einer Kampagne zugeordnet; die Suche berücksichtigt Scope und prüft zurückgegebene Zeilen zusätzlich. Bestätigte Präferenzen haben einen separaten Ladepfad mit Quellen und Freigabehistorie. Der Fluxini-Vertrag macht workspaceId und projectId verpflichtend, ergänzt branchId und snapshotRevision und verweigert private Retrieval-Anfragen bei fehlendem Scope. Projektübergreifende Rezepte sind eine explizite Bibliothek. Die heute optionalen Scope-Felder werden nicht unverändert zum Desktop-Vertrag. [Scope](D:/OMMAX/packages/mem-layer/src/scope.ts:54) · [Bestätigte Präferenzen](D:/OMMAX/packages/mem-layer/src/preferences.ts:192)

**Ereignisgedächtnis:** recordMemory speichert Ereignisse auch ohne erfolgreiches Embedding, sofern eine Datenbank vorhanden ist, und liefert einen Status. Ohne Datenbank wird das Schreiben übersprungen; Retrieval fällt auf Seed-Wissen zurück. Das ist noch kein persistentes Offline-Gedächtnis. [Schreiben](D:/OMMAX/packages/mem-layer/src/memory.ts:83) · [Fallback](D:/OMMAX/packages/mem-layer/src/vector.ts:260)

**Eigene KI-Ausführung:** structured-call.ts enthält schemaorientierte Aufrufe mit begrenzten Wiederholungen. flow/executor.ts enthält eigene Workflow-Ausführung und API-Aufrufe. Das Memory-Paket verwendet derzeit das AI SDK und einen Gateway-Adapter als Modellzugang sowie den PostgreSQL-Treiber; LangChain gehört nicht zu seinen direkten Abhängigkeiten. Der Geometriekern wird eigenständig gebaut, während diese Ausführungsmuster für die KI nutzbar sind. [Strukturierte Aufrufe](D:/OMMAX/apps/web/src/lib/structured-call.ts:174) · [Flow-Executor](D:/OMMAX/apps/web/src/lib/flow/executor.ts:119) · [Paketabhängigkeiten](D:/OMMAX/packages/mem-layer/package.json:10)

**Entkopplung ist erforderlich:** Das Paket kennt Kampagnenphasen, Markenregeln und produktspezifische Tabellen. Die Runtime-Injektion nimmt heute einen PostgreSQL-kompatiblen SQL-Client entgegen und wurde für Tests/Messungen entworfen; sie ist kein beliebiger SQLite-Adapter. Die Webintegration verwendet zudem Next.js after() für nachgelagerte Schreibvorgänge. Diese Lebenszyklen werden im Desktop durch eigene persistente Jobs ersetzt. [Runtime](D:/OMMAX/packages/mem-layer/src/runtime.ts:20) · [Web-Schreibpfad](D:/OMMAX/apps/web/src/lib/memory-write.ts:29)

Vorhandene Tests zu Scope, Budgets, Präferenzfreigaben und Schreibfehlern liefern eine gute Vorlage für Desktop-Vertragstests. Die Testdateien wurden gelesen; ein aktueller erfolgreicher Testlauf des OMMAX-Projekts wird hier nicht behauptet.

---

## 17. Flux auf dem PC: geplante Integrationsgrenze

**Ein wiederverwendbarer Flux-Kern:** Kontextabschnitte, Budgetierung, RRF, Quellenzuordnung und Präferenzzustände werden als domänenunabhängiger TypeScript-Kern extrahiert. Die Paketnamen „flux-memory-core“, „flux-memory-desktop“ und „fluxini-ai-runtime“ sind Zielstruktur, keine heute vorhandenen Module. Die Extraktion erfolgt später als gezielte Änderung; für dieses Konzept wurde OMMAX nur gelesen.

**Fachliche Ports:** Ein neuer MemoryStore stellt Ereignisse, Präferenzen, Wissenssuche und Quellen bereit. Ein Embedder-Port kapselt Einbettungen. Ein SceneContextProvider liest Auswahl, Einheiten, Sperren, Operatorversionen und Diagnostik aus der Rust-Engine. Der portable Kern erzeugt keine SQL-Abfragen selbst. Ein separater Adapter kann PostgreSQL weiter bedienen, während der Desktop-Adapter SQLite nutzt.

**Lokales Gedächtnis zuerst:** SQLite speichert Ereignisse, Präferenzen und Quellen; FTS5 liefert lokale Volltextsuche. Optionale Embeddings werden mit Modellkennung, Dimension und Inhaltsversion gespeichert. Bei kleinen projektbezogenen Beständen ist zunächst eine exakte Vektorsuche nach Scope-Filterung prüfbar; ein ANN-Index folgt erst bei gemessenem Bedarf. FTS5 allein ist kein Vektorindex und reproduziert nicht automatisch die bisherige deutsche PostgreSQL-Suche. [SQLite FTS5](https://www.sqlite.org/fts5.html)

**Ausführung auf Windows:** Die mitgelieferte TypeScript-/Node-Komponente lädt keine Next.js-Routen. Sie wird durch Tauri gestartet, nutzt eine versionierte stdin/stdout-Schnittstelle und besitzt ausschließlich ihre Memory-Datenbank. Projektdateien, Undo, Revisionsprüfung und Geometrie bleiben beim Rust-Kern. Installation, Absturzbehandlung, Updates und Startzeit des Begleitprozesses werden im ersten Vorversuch geprüft. [Tauri-Sidecars](https://v2.tauri.app/develop/sidecar/)

**Verlässlicher Schreibpfad:** Eine übernommene Graph-Änderung erhält eine eindeutige eventId und wird zusammen mit einem ausstehenden Flux-Ereignis im Projektjournal bestätigt. Ein Worker stellt das Ereignis an Flux zu; eventId verhindert doppelte Einträge nach Neustarts. Embedding-Erzeugung ist ein späterer, wiederholbarer Job. Scheitert Flux vorübergehend, bleibt die Szene gültig und das noch ausstehende Ereignis sichtbar. Dieses Outbox-Verfahren ist neu zu implementieren und keine bereits vorhandene Eigenschaft von recordMemory.

**Fluxini-Kontext:** Auftrag, aktueller Szenenausschnitt, verbindliche Regeln, bestätigte Artist-Präferenzen, Projektgeschichte, gefundene Rezepte und Diagnostik erhalten getrennte Abschnitte. Jeder Abruf trägt Projekt, Variante und die Referenzrevision. Speicherbare Ereignisse sind beispielsweise patch_committed, patch_undone, preview_failed, recipe_saved und preference_approved. Gespeichert werden Referenzen, kurze Begründungen und ausgewählte Parameteränderungen; große Meshes und Simulationscaches verbleiben im Asset-/Engine-Speicher.

**Prioritäten:** Aktuelle Engine-Fakten und technisch durchgesetzte Sperren gelten verbindlich. Historische Entscheidungen und ähnliche Rezepte unterstützen Vorschläge. Eine gelernte Vorliebe wird erst nach bewusster Übernahme zur allgemeinen Präferenz. Das Kontextbudget wird an Operatorverträgen gemessen; die bisherigen Marketing-Budgets und die grobe Vier-Zeichen-pro-Token-Schätzung werden nicht als universelle Garantie übernommen.

**Beispiel:** „Felsen natürlicher verteilen, den Weg frei halten.“ Flux liefert die aktuelle Wegmaske, die gespeicherte Projektentscheidung „zwei Meter Abstand“, ein passendes Scatter-Rezept und die gültige Operatorversion. Die KI schlägt eine Änderung vor. Die Engine prüft die aktuelle Revision und den Mindestabstand, berechnet eine Vorschau und übernimmt den gewählten Patch. Erst dessen tatsächlicher Ausgang fließt als Ereignis zurück in Flux.

**Erstes Integrationspaket:** MemoryStore-Vertrag und synthetische Testdaten; SQLite-Persistenz und FTS5; isolierte Projekt-/Variantenabfragen; ein Flux-Kontextpaket für eine Szenenauswahl; genau ein strukturierter Parameter-Patch; dauerhafte Ereigniszustellung mit Neustarttest. Damit wird die Wiederverwendung früh anhand eines vollständigen Ablaufs geprüft.
