# Images SVG du Jeu Production Runner

Ce dossier contient toutes les images SVG vectorielles utilisées dans le jeu Production Runner, avec le thème industriel ifm.

## 🎨 Palette de couleurs

- **Orange ifm**: `#ED6B00` (principal), `#FF8800` (secondaire)
- **Vert ifm**: `#00FF88` (sensors), `#00FFAA` (highlights)
- **Rouge**: `#FF3333` (température)
- **Rose/Magenta**: `#FF66FF` (pression)
- **Cyan**: `#00FFFF` (vibration)
- **Orange/Ambre**: `#FFA500` (usure)
- **Doré**: `#FFD700` (maintenance)
- **Bleu**: `#4169E1` (protection)

## 📁 Fichiers créés

### Robot (Joueur) - 32x32px
- `robot-up.svg` - Robot orange avec tête vers le haut, yeux verts lumineux
- `robot-down.svg` - Robot orange avec tête vers le bas
- `robot-left.svg` - Robot orange avec tête vers la gauche
- `robot-right.svg` - Robot orange avec tête vers la droite

### Malfunctions (Ennemis) - 32x32px
- `malfunction-temperature.svg` - Rouge (défaut de température) avec symbole thermomètre
- `malfunction-pressure.svg` - Rose/Magenta (défaut de pression) avec jauge de pression
- `malfunction-vibration.svg` - Cyan (défaut de vibration) avec ondes de vibration
- `malfunction-wear.svg` - Orange/Ambre (usure) avec symbole de fissure

### Éléments de terrain
- `sensor-data.svg` - 8x8px - Petit point vert lumineux (données capteur à collecter)
- `maintenance-station.svg` - 16x16px - Grande pastille dorée avec effet de brillance
- `wall.svg` - 32x32px - Mur métallique industriel avec rivets et panneaux
- `ghost-door.svg` - 32x32px - Porte de la maison fantôme (barrière énergétique cyan)

### Bonus - 24x24px
- `bonus-diagnostic.svg` - Outil de diagnostic (cyan, symbole clé à molette)
- `bonus-speed.svg` - Éclair de vitesse (doré)
- `bonus-shield.svg` - Bouclier de protection (bleu)

### UI
- `life-icon.svg` - 24x24px - Icône de vie avec logo ifm (cercle vert/blanc)

## 🔧 Intégration

Les images sont chargées dans `game-canvas.component.ts` via la méthode `initAssets()`:

```typescript
// Exemples de chemins
this.robotUpImage.src = 'assets/svg/robot-up.svg';
this.sensorDataImage.src = 'assets/svg/sensor-data.svg';
this.maintenanceStationImage.src = 'assets/svg/maintenance-station.svg';
```

## 📊 Caractéristiques techniques

- **Format**: SVG (Scalable Vector Graphics)
- **Avantages**: 
  - Qualité parfaite à toute échelle
  - Taille de fichier réduite
  - Modification facile des couleurs
  - Pas de pixelisation
- **Compatibilité**: Tous les navigateurs modernes

## 🎮 Mapping du jeu

| Ancienne image PNG | Nouvelle image SVG | Élément de jeu |
|-------------------|-------------------|----------------|
| `blueGhost.png` | `malfunction-vibration.svg` | Malfunction Cyan |
| `orangeGhost.png` | `malfunction-wear.svg` | Malfunction Orange |
| `pinkGhost.png` | `malfunction-pressure.svg` | Malfunction Rose |
| `redGhost.png` | `malfunction-temperature.svg` | Malfunction Rouge |
| `robot-*.svg` | `robot-*.svg` | Sprites du robot |
| `wall.png` | `wall.svg` | Murs industriels |
| `powerFood.png` | `maintenance-station.svg` | Stations de maintenance |
| `cherry.png` | `bonus-diagnostic.svg` | Bonus outil diagnostic |

---
*Créé le 24 décembre 2025*
*Thème: ifm Industrial Automation*
