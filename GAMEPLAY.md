# 🎭 Masques et Outrage : Mécaniques de Gameplay

Ce document détaille les règles et les mécaniques de jeu de *Masques et Outrage* après les derniers ajustements.

## Concept

Vous incarnez un agitateur social dont le but est de manipuler l'opinion publique en portant différents "masques" idéologiques. Votre objectif est de survivre et d'atteindre l'une des fins possibles en gérant finement votre **Vie** et votre niveau d'**Outrage**.

## 🕹️ Contrôles

-   **ZQSD** : Se déplacer sur la planète.
-   **Souris** : Orienter la caméra.
-   **Touches 1 à 7** : Équiper un des 7 masques idéologiques.
-   **Échap** : Retirer son masque pour revenir à l'état neutre.

## 核心机制 (Core Mechanics)

Le jeu s'articule autour de deux jauges principales : la Vie (Énergie) et l'Outrage.

### Les Masques Idéologiques

Les masques sont votre outil principal d'interaction avec le monde. Chaque masque correspond à l'une des 7 idéologies des groupes de PNJs.

-   Porter un masque est nécessaire pour interagir avec les foules.
-   Le port d'un masque ne consomme **plus** de vie par défaut.

### La Jauge de Vie (Énergie)

Votre jauge de vie représente votre capacité à poursuivre vos actions.

#### Perte de Vie

-   **Cause** : Votre vie diminue **uniquement** lorsque vous provoquez de l'outrage.
-   **Mécanisme** : En vous tenant à proximité d'un PNJ avec un masque **différent** du vôtre, vous générez de l'outrage, ce qui consomme votre énergie.
-   **Taux** : La perte est faible (`0.1` par PNJ par "tick" d'interaction), mais peut s'accélérer si vous êtes au milieu d'une foule hostile.

#### Gain de Vie

-   **Mécanisme** : Vous regagnez de la vie en vous intégrant à une foule qui partage votre idéologie.
-   **Condition** : Portez le **même** masque que les PNJs à proximité pour commencer à recharger votre jauge de vie.
-   **Taux** : La recharge est rapide (`25` points par seconde, répartis sur chaque "tick" d'interaction).

Si votre vie tombe à zéro, votre masque est automatiquement retiré, vous forçant à devenir neutre.

### La Jauge d'Outrage

Cette jauge représente le niveau de tension et de polarisation général.

#### Augmentation de l'Outrage

-   **Cause** : Porter un masque **différent** de celui des PNJs à proximité.
-   **Taux** : L'augmentation est lente (`0.2` par PNJ par "tick"), mais cumulative. Créer de l'outrage dans une large foule hétérogène le fera monter en flèche.

#### Diminution de l'Outrage

-   **Mécanisme 1 (Interaction positive)** : Porter le **même** masque qu'un PNJ fait légèrement baisser l'outrage (`0.01` par PNJ par "tick").
-   **Mécanisme 2 (Passivité)** : Si vous n'interagissez avec aucune foule, l'outrage diminue lentement et passivement (`0.05` par seconde).

## 👥 Personnages

### Le Joueur

-   Taille : `0.5`
-   Vitesse : `20`
-   Distance de la caméra : `10`

### Les PNJs (Personnages Non-Joueurs)

-   Ils se déplacent en groupes partageant la même idéologie (couleur).
-   Leur vitesse de base est de `2` avec une variation de `8`.
-   La distance d'interaction avec le joueur est de `1.5`.

### La Police

-   **Apparition** : La police est alertée et apparaît lorsque la jauge d'**Outrage atteint 90%**.
-   **Comportement** : Elle vous prend en chasse et se déplace plus rapidement que vous.
-   **Disparition** : La police se retire si le niveau d'outrage redescend en dessous du seuil.

## 🏁 Fins de Partie

Le jeu peut se terminer de plusieurs manières :

1.  **FIN "CHAOS" (Victoire ?)**
    -   **Condition** : Maintenir le niveau d'**Outrage à 100% pendant 30 secondes**.
    -   **Résultat** : Le monde sombre dans le chaos total.

2.  **FIN "ADULTE" (Victoire)**
    -   **Condition** : Maintenir le niveau d'**Outrage en dessous de 10% pendant 3 minutes**.
    -   **Résultat** : Vous avez choisi la voie de la modération.

3.  **FIN "POLICE" (Défaite)**
    -   **Condition** : Se faire attraper par la police.
    -   **Résultat** : Game Over. 