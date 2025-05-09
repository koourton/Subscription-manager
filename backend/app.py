from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from flask_cors import CORS
import os

app = Flask(__name__)
# Configure CORS to allow requests from the frontend
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///subscription_system.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

db = SQLAlchemy(app)
jwt = JWTManager(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')  # 'user', 'admin'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    subscriptions = db.relationship('Subscription', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Plan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)  # Added unique=True
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    duration_days = db.Column(db.Integer, nullable=False)  # subscription duration in days
    features = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    subscriptions = db.relationship('Subscription', backref='plan', lazy=True)

class Subscription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('plan.id'), nullable=False)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def is_expired(self):
        return datetime.utcnow() > self.end_date

# rror handling for JWT
@jwt.unauthorized_loader
def unauthorized_response(callback):
    return jsonify({
        'message': 'Missing Authorization Header'
    }), 401

@jwt.invalid_token_loader
def invalid_token_response(error_string):
    return jsonify({
        'message': 'Invalid token: ' + error_string
    }), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'message': 'Token has expired'
    }), 401

# Routes
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists'}), 409
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already exists'}), 409
    
    user = User(
        username=data['username'],
        email=data['email'],
        role=data.get('role', 'user')
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User created successfully'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'message': 'Invalid credentials'}), 401
    
    access_token = create_access_token(
        identity=str(user.id),  
        additional_claims={
            'role': user.role,
            'username': user.username
        }
    )
    return jsonify(access_token=access_token), 200

@app.route('/users/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        user = User.query.get_or_404(int(user_id))
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'created_at': user.created_at.isoformat()
        }), 200
    except Exception as e:
        app.logger.error(f"Error in get_current_user: {str(e)}")
        return jsonify({'message': f'Error retrieving user: {str(e)}'}), 500

@app.route('/users/<int:id>', methods=['GET'])
@jwt_required()
def get_user(id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get_or_404(int(current_user_id))
        
        if current_user.role != 'admin' and current_user.id != id:
            return jsonify({'message': 'Unauthorized'}), 403
            
        user = User.query.get_or_404(id)
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'created_at': user.created_at.isoformat()
        }), 200
    except Exception as e:
        app.logger.error(f"Error in get_user: {str(e)}")
        return jsonify({'message': f'Error retrieving user: {str(e)}'}), 500

# Get all users (for admin)
@app.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get_or_404(int(current_user_id))
        
        if current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized. Admin privileges required.'}), 403
        
        users = User.query.all()
        return jsonify([{
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'created_at': user.created_at.isoformat() if user.created_at else None
        } for user in users]), 200
    except Exception as e:
        app.logger.error(f"Error in list_users: {str(e)}")
        return jsonify({'message': f'Error listing users: {str(e)}'}), 500

# Delete user
@app.route('/users/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_user(id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get_or_404(int(current_user_id))
        
        if current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
            
        # Prevent deleting the admin user
        if id == 1:
            return jsonify({'message': 'Cannot delete main admin user'}), 403
        
        user = User.query.get_or_404(id)
        
        # Delete user's subscriptions first
        Subscription.query.filter_by(user_id=id).delete()
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        app.logger.error(f"Error in delete_user: {str(e)}")
        return jsonify({'message': f'Error deleting user: {str(e)}'}), 500

# Update user
@app.route('/users/<int:id>', methods=['PATCH'])
@jwt_required()
def update_user(id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get_or_404(int(current_user_id))
        
        if current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
            
        user = User.query.get_or_404(id)
        data = request.get_json()
        
        if 'role' in data:
            user.role = data['role']
        
        db.session.commit()
        
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'created_at': user.created_at.isoformat()
        }), 200
    except Exception as e:
        app.logger.error(f"Error in update_user: {str(e)}")
        return jsonify({'message': f'Error updating user: {str(e)}'}), 500

# Plan endpoints
@app.route('/plans', methods=['GET'])
def get_plans():
    plans = Plan.query.filter_by(is_active=True).all()
    return jsonify([{
        'id': plan.id,
        'name': plan.name,
        'description': plan.description,
        'price': plan.price,
        'duration_days': plan.duration_days,
        'features': plan.features
    } for plan in plans]), 200

# Get all plans including inactive ones (for admin)
@app.route('/plans/all', methods=['GET'])
@jwt_required()
def get_all_plans():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get_or_404(int(current_user_id))
        
        if current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
            
        plans = Plan.query.all()
        return jsonify([{
            'id': plan.id,
            'name': plan.name,
            'description': plan.description,
            'price': plan.price,
            'duration_days': plan.duration_days,
            'features': plan.features,
            'is_active': plan.is_active
        } for plan in plans]), 200
    except Exception as e:
        app.logger.error(f"Error in get_all_plans: {str(e)}")
        return jsonify({'message': f'Error retrieving plans: {str(e)}'}), 500

@app.route('/plans', methods=['POST'])
@jwt_required()
def create_plan():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get_or_404(int(current_user_id))
        
        if current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
            
        data = request.get_json()
        
        # Check if a plan with this name already exists
        existing_plan = Plan.query.filter_by(name=data['name']).first()
        if existing_plan:
            return jsonify({'message': 'A plan with this name already exists'}), 409
        
        plan = Plan(
            name=data['name'],
            description=data.get('description', ''),
            price=data['price'],
            duration_days=data['duration_days'],
            features=data.get('features', '')
        )
        
        db.session.add(plan)
        db.session.commit()
        
        return jsonify({
            'id': plan.id,
            'name': plan.name,
            'description': plan.description,
            'price': plan.price,
            'duration_days': plan.duration_days,
            'features': plan.features
        }), 201
    except Exception as e:
        app.logger.error(f"Error in create_plan: {str(e)}")
        return jsonify({'message': f'Error creating plan: {str(e)}'}), 500

# Update plan
@app.route('/plans/<int:id>', methods=['PUT'])
@jwt_required()
def update_plan(id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get_or_404(int(current_user_id))
        
        if current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
            
        plan = Plan.query.get_or_404(id)
        data = request.get_json()
        
        # If name is being changed, check for duplicates
        if 'name' in data and data['name'] != plan.name:
            existing_plan = Plan.query.filter_by(name=data['name']).first()
            if existing_plan:
                return jsonify({'message': 'A plan with this name already exists'}), 409
            plan.name = data['name']
            
        if 'description' in data:
            plan.description = data['description']
        if 'price' in data:
            plan.price = data['price']
        if 'duration_days' in data:
            plan.duration_days = data['duration_days']
        if 'features' in data:
            plan.features = data['features']
        if 'is_active' in data:
            plan.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'id': plan.id,
            'name': plan.name,
            'description': plan.description,
            'price': plan.price,
            'duration_days': plan.duration_days,
            'features': plan.features,
            'is_active': plan.is_active
        }), 200
    except Exception as e:
        app.logger.error(f"Error in update_plan: {str(e)}")
        return jsonify({'message': f'Error updating plan: {str(e)}'}), 500

# Patch plan (partial update)
@app.route('/plans/<int:id>', methods=['PATCH'])
@jwt_required()
def patch_plan(id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get_or_404(int(current_user_id))
        
        if current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
            
        plan = Plan.query.get_or_404(id)
        data = request.get_json()
        
        # If name is being changed, check for duplicates
        if 'name' in data and data['name'] != plan.name:
            existing_plan = Plan.query.filter_by(name=data['name']).first()
            if existing_plan:
                return jsonify({'message': 'A plan with this name already exists'}), 409
            plan.name = data['name']
            
        if 'description' in data:
            plan.description = data['description']
        if 'price' in data:
            plan.price = data['price']
        if 'duration_days' in data:
            plan.duration_days = data['duration_days']
        if 'features' in data:
            plan.features = data['features']
        if 'is_active' in data:
            plan.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'id': plan.id,
            'name': plan.name,
            'description': plan.description,
            'price': plan.price,
            'duration_days': plan.duration_days,
            'features': plan.features,
            'is_active': plan.is_active
        }), 200
    except Exception as e:
        app.logger.error(f"Error in patch_plan: {str(e)}")
        return jsonify({'message': f'Error updating plan: {str(e)}'}), 500

# Delete plan
@app.route('/plans/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_plan(id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get_or_404(int(current_user_id))
        
        if current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
            
        plan = Plan.query.get_or_404(id)
        db.session.delete(plan)
        db.session.commit()
        
        return jsonify({'message': 'Plan deleted successfully'}), 200
    except Exception as e:
        app.logger.error(f"Error in delete_plan: {str(e)}")
        return jsonify({'message': f'Error deleting plan: {str(e)}'}), 500

# Subscription endpoints
@app.route('/subscriptions', methods=['POST'])
@jwt_required()
def create_subscription():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        # Debug info
        print(f"Creating subscription - User ID: {user_id}, Plan ID: {data.get('plan_id')}")
        
        plan = Plan.query.get_or_404(int(data['plan_id']))
        
        # Check if user already has an active subscription to this plan
        existing_subscription = Subscription.query.filter_by(
            user_id=int(user_id), 
            plan_id=data['plan_id'], 
            is_active=True
        ).first()
        
        if existing_subscription and not existing_subscription.is_expired():
            return jsonify({
                'message': 'You already have an active subscription to this plan'
            }), 400
        
        end_date = datetime.utcnow() + timedelta(days=plan.duration_days)
        
        subscription = Subscription(
            user_id=int(user_id),  
            plan_id=data['plan_id'],
            end_date=end_date
        )
        
        db.session.add(subscription)
        db.session.commit()
        
        return jsonify({
            'id': subscription.id,
            'plan_id': subscription.plan_id,
            'plan_name': plan.name,
            'start_date': subscription.start_date.isoformat(),
            'end_date': subscription.end_date.isoformat(),
            'is_active': subscription.is_active
        }), 201
    except Exception as e:
        app.logger.error(f"Error in create_subscription: {str(e)}")
        return jsonify({'message': f'Error creating subscription: {str(e)}'}), 500

@app.route('/subscriptions', methods=['GET'])
@jwt_required()
def get_user_subscriptions():
    try:
        user_id = get_jwt_identity()
        subscriptions = Subscription.query.filter_by(user_id=int(user_id)).all()
        
        return jsonify([{
            'id': sub.id,
            'plan_id': sub.plan_id,
            'plan_name': sub.plan.name,
            'start_date': sub.start_date.isoformat(),
            'end_date': sub.end_date.isoformat(),
            'is_active': sub.is_active and not sub.is_expired()
        } for sub in subscriptions]), 200
    except Exception as e:
        app.logger.error(f"Error in get_user_subscriptions: {str(e)}")
        return jsonify({'message': f'Error retrieving subscriptions: {str(e)}'}), 500

@app.route('/subscriptions/all', methods=['GET'])
@jwt_required()
def get_all_subscriptions():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get_or_404(int(current_user_id))
        
        if current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
            
        subscriptions = Subscription.query.all()
        
        return jsonify([{
            'id': sub.id,
            'user_id': sub.user_id,
            'username': sub.user.username,
            'plan_id': sub.plan_id,
            'plan_name': sub.plan.name,
            'start_date': sub.start_date.isoformat(),
            'end_date': sub.end_date.isoformat(),
            'is_active': sub.is_active and not sub.is_expired()
        } for sub in subscriptions]), 200
    except Exception as e:
        app.logger.error(f"Error in get_all_subscriptions: {str(e)}")
        return jsonify({'message': f'Error retrieving subscriptions: {str(e)}'}), 500

# Cancel subscription (set is_active to False)
@app.route('/subscriptions/<int:id>', methods=['DELETE'])
@jwt_required()
def cancel_subscription(id):
    try:
        user_id = get_jwt_identity()
        subscription = Subscription.query.get_or_404(id)
        
        current_user = User.query.get(int(user_id))
        if current_user.role != 'admin' and subscription.user_id != int(user_id):
            return jsonify({'message': 'Unauthorized'}), 403
        
        # If subscription is active, just set it to inactive (cancel)    
        if subscription.is_active:
            subscription.is_active = False
            db.session.commit()
            
            return jsonify({'message': 'Subscription canceled successfully'}), 200
        else:
            # If already inactive, actually delete it
            db.session.delete(subscription)
            db.session.commit()
            
            return jsonify({'message': 'Subscription deleted successfully'}), 200
            
    except Exception as e:
        app.logger.error(f"Error in cancel_subscription: {str(e)}")
        return jsonify({'message': f'Error with subscription: {str(e)}'}), 500

# Initialize the database
with app.app_context():
    db.create_all()
    
    # Create admin user if it doesn't exist
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            email='admin@example.com',
            role='admin'
        )
        admin.set_password('admin123')
        db.session.add(admin)
        
        db.session.commit()

if __name__ == '__main__':
    app.run(debug=True)
