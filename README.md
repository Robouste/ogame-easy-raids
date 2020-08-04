# OgameEasyRaids

![apercu](https://github.com/Robouste/ogame-easy-raids/blob/master/src/assets/overview-3.png "Apercu")

Système de gestion de raids (utile pour les raids contre les inactifs)

Permet de centraliser tous les rapports d'espionnage dans un tableau.

## Features

-   Trier par quantité ressources
-   Calcul du nombre de grand transporteurs requis
-   Raccourci vers la page "Flotte" du jeu, avec les coordonnées et le type de mission pré-selectionné

-   Possiblité de pré-sélectionner le nombre de grand transporteurs via un petit script à ajouter via une extension.

## Pré-requis

-   [Node.js version >= 12](https://nodejs.org/)

## Installation

-   Exécuter fichier `install.bat`

## Lancer l'application

-   Exécuter fichier `run.bat`

## Utilisation

-   Accédez à la page contenant vos rapports d'espionnage.
-   CTRL + A, CTRL + C
-   Coller le contenu dans la partie supérieur de ogame-easy-raids
-   Appuyez sur "Add"
-   Recommencez l'opération pour chaque page de rapports d'espionnages (si vous en avez plus de 10)

## Extra

Il est possible de pré-sélectionner les transporteurs sur la page de flotte.

-   Installer une extension permettant d'exécuter du JavaScript (Ex: [Run Javascript](https://chrome.google.com/webstore/detail/run-javascript/lmilalhkkdhfieeienjbiicclobibjao))
-   Utiliser le script suivant:

```js
let currentUrl = window.location.href;

if (currentUrl.includes("fleetdispatch")) {
	if (currentUrl.includes("cargo")) {
		let shipAmount = currentUrl.split("cargo")[1].split("=")[1];
		let element = document.querySelector("input[name='transporterLarge']");
		element.focus();
		element.value = shipAmount;
	}
}
```

-   Après avoir cliqué sur des coordonnées et être sur la page flotte, le nombre de grand transporteur devrait être pré-rempli. Appuyez une première sur Enter, ignorez le message d'erreur et appuyez une deuxième fois sur Enter.
