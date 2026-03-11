# pocketbase-bun-react-shadcn-starterkit

Starter kit monorepo avec :
- PocketBase pour le backend et l'authentification
- Bun pour l'execution et les scripts
- React + React Router v7 + shadcn/ui pour le frontend
- Docker et Docker Compose pour le dev et le deploiement

## Contenu

- `frontend/` : application React
- `backend/` : PocketBase, donnees locales et image Docker
- `scripts/` : scripts Bun pour installer et lancer PocketBase

## Fonctionnalites deja integrees

- installation locale de PocketBase selon l'OS et l'architecture
- creation ou mise a jour automatique du superutilisateur au demarrage
- stack Docker de production et stack Docker de developpement
- page de connexion branchee a PocketBase
- route de login publique et layout protege
- prise en charge dynamique des methodes d'auth actives :
  - identifiant + mot de passe
  - code de connexion par email
  - OAuth2 providers configures
- notifications frontend avec Sonner
- generation de types TypeScript depuis `backend/pb_data/data.db`

## Prerequis

- Bun
- Docker et Docker Compose si tu veux utiliser la stack conteneurisee

## Demarrage rapide en local

Option recommandee pour preparer le projet :

```bash
bun run setup
```

Cette commande :
- cree `.env` et `frontend/.env` s'ils sont absents
- verifie l'installation locale de PocketBase
- genere les types PocketBase si `backend/pb_data/data.db` existe
- n'impacte pas Docker ni les scripts de deploiement

Ou en detail :

1. Installer PocketBase localement :

```bash
bun run install:pocketbase
```

2. Creer le fichier d'environnement :

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

3. Lancer PocketBase :

```bash
bun run dev:backend
```

4. Dans un autre terminal, lancer le frontend :

```bash
bun run dev:frontend
```

Frontend : `http://localhost:3000`  
PocketBase : `http://localhost:8090`

## Superutilisateur PocketBase

Les variables suivantes peuvent etre definies dans `.env` :

```bash
PB_SUPERUSER_EMAIL=admin@example.com
PB_SUPERUSER_PASSWORD=change-me-now
```

Quand elles sont presentes :
- en local, `bun run dev:backend` execute `pocketbase superuser upsert` avant `serve`
- en Docker, le conteneur backend fait la meme chose au demarrage

Le comportement est idempotent : au premier lancement le compte est cree, ensuite il est mis a jour si besoin.

## Docker

Lancer la stack de base :

```bash
cp .env.docker.example .env
docker compose up --build
```

Ou avec les scripts :

```bash
bun run docker:up
bun run docker:down
```

Ports exposes :
- frontend : `http://localhost:3000`
- PocketBase : `http://localhost:8090`

Volumes Docker :
- `pocketbase_data`
- `pocketbase_public`

Healthchecks :
- backend : `GET /api/health`
- frontend : endpoint HTTP interne

Le frontend attend un backend `healthy` avant de demarrer.

## Docker Dev

La stack de dev monte les sources frontend et les donnees PocketBase locales :

```bash
cp .env.docker.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Ou avec les raccourcis :

```bash
bun run docker:up:dev
bun run docker:down:dev
```

Dans ce mode :
- le frontend tourne avec hot reload
- `backend/pb_data` et `backend/pb_public` sont montes depuis la machine

## Authentification frontend

Le frontend contient deja :
- une route publique `/login`
- un layout protege pour les routes privees
- un client PocketBase partage
- une restauration de session au chargement

La page de connexion detecte les methodes disponibles sur la collection `users` avec `listAuthMethods()` et adapte l'interface :
- si une seule methode est active, elle est affichee directement
- si plusieurs methodes locales sont actives, la selection se fait avec des onglets
- les providers OAuth2 sont affiches en boutons `Se connecter avec ...`

## Generation des types PocketBase

Les types frontend sont generes depuis la base SQLite locale :

```bash
bun run generate:pocketbase-types
```

Fichier genere :
- [frontend/src/lib/pocketbase-types.ts](/Users/alexandre/00_PROJETS/pocketbase-bun-react-shadcn-starterkit/frontend/src/lib/pocketbase-types.ts)

Le client PocketBase frontend est deja type via ce fichier :
- [frontend/src/lib/pocketbase.ts](/Users/alexandre/00_PROJETS/pocketbase-bun-react-shadcn-starterkit/frontend/src/lib/pocketbase.ts)

Si tu modifies le schema PocketBase, pense a regenerer les types.

## Scripts utiles

Racine du repo :

```bash
bun run install:pocketbase
bun run generate:pocketbase-types
bun run setup
bun run dev:backend
bun run dev:frontend
bun run build:frontend
bun run docker:up
bun run docker:up:dev
bun run docker:down
bun run docker:down:dev
```

## Variables d'environnement

Exemples disponibles :
- [`.env.example`](/Users/alexandre/00_PROJETS/pocketbase-bun-react-shadcn-starterkit/.env.example) : local/backend
- [`.env.docker.example`](/Users/alexandre/00_PROJETS/pocketbase-bun-react-shadcn-starterkit/.env.docker.example) : Docker/backend
- [frontend/.env.example](/Users/alexandre/00_PROJETS/pocketbase-bun-react-shadcn-starterkit/frontend/.env.example) : frontend public

Separation actuelle :
- racine `.env` : variables backend, scripts Bun et Docker Compose
- `frontend/.env` : variables publiques consommees par l'application React

Variables backend et Docker :
- `PB_VERSION` : version de PocketBase utilisee dans l'image Docker backend
- `PB_HOST` : host du serveur PocketBase en Docker
- `PB_PORT` : port du serveur PocketBase
- `PB_SUPERUSER_EMAIL` : email du superutilisateur initial
- `PB_SUPERUSER_PASSWORD` : mot de passe du superutilisateur initial

Variables frontend publiques :
- `PUBLIC_POCKETBASE_URL` : URL explicite du backend PocketBase pour le frontend
- `POCKETBASE_URL` : fallback equivalent si besoin

## Workflow conseille apres une modification de schema

1. Mettre a jour le schema dans PocketBase
2. Regenerer les types :

```bash
bun run generate:pocketbase-types
```

3. Redemarrer le frontend si necessaire
4. Verifier le build :

```bash
bun run build:frontend
```

## Prochaines extensions naturelles

- inscription utilisateur
- mot de passe oublie / verification email
- collection d'auth configurable au lieu de `users` en dur
- exemples CRUD typés sur une collection metier
