# Subscription-manager
Simple full stack implementation of a subscription system

##Initializing the backend
```
cd backend
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

uv pip install flask flask-sqlalchemy flask-jwt-extended flask-cors

export FLASK_APP=app.py
export FLASK_ENV=development
flask run
```

##Initializing the frontend
```
cd frontend
yarn install
yarn start
```
