from flask_cors import CORS

# Add this after creating the Flask app
CORS(app, resources={r"/*": {"origins": "*"}})