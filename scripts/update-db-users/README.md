# dust-scripts / DB

## Update

Gets all relevant users from graph / m365 and måks them up to mongodb

# dust-scripts / node

Node scripts used by DUST

## Setup

### .env

Create a `.env` file in node root folder with this content:
```bash
MONGODB_CONNECTION=mongodb+srv://<username>:<password>@<server>?retryWrites=true&w=majority
MONGODB_USERS_COLLECTION=collectionname
MONGODB_USERS_NAME=databasename
```

## Scripts

### db-update

**Must be called with one of the required types**:
- *users*
- *sds*

Remove all users from db and update db with users from `.\db-update\data\users.json`
```bash
node .\index.js users
```