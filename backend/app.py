from flask import Flask, request, jsonify, session
from flask_bcrypt import Bcrypt
from flask import send_from_directory
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import timedelta
import mysql.connector
from flask_cors import CORS
import re
import secrets

app = Flask(__name__)
bcrypt = Bcrypt(app)

app.permanent_session_lifetime = timedelta(hours=2)

app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_REFRESH_EACH_REQUEST'] = True

# Change to True in HTTPS production
app.config['SESSION_COOKIE_SECURE'] = False

app.secret_key = 'super_secret_key_for_local_use' # Change this in production
CORS(app, supports_credentials=True,
        origins=[
            "*"
        ])

# Database connection configuration
db_config = {
    'host': 'localhost',
    'user': 'gapangita_user',
    'password': 'Gapangita_Secure_123!',
    'database': 'gapangita_db_test'
}

# FOR ITEM AND CLAIMANT CAMERA
UPLOAD_FOLDER = 'uploads'

ITEM_UPLOAD_FOLDER = os.path.join(UPLOAD_FOLDER, 'items')
CLAIMANT_UPLOAD_FOLDER = os.path.join(UPLOAD_FOLDER, 'claimant')

os.makedirs(ITEM_UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CLAIMANT_UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
# ================================

MAX_DESCRIPTION_LENGTH = 1000
ALLOWED_ITEM_TYPES = ['lost', 'found']
USERNAME_REGEX = r'^[a-zA-Z0-9_]{3,20}$'

def get_db_connection():
    return mysql.connector.connect(**db_config)

# Helper function to check allowed file extensions 
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Helper Function for setting user context in DB (for logging/auditing)
def set_db_user_context(cursor):
    cursor.execute(
        """
        SET @logged_in_user_code = %s,
            @logged_in_username = %s
        """,
        (
            session.get('user_code'),
            session.get('username')
        )
    )

def levenshtein_distance(s1, s2):
    s1, s2 = s1.lower(), s2.lower()
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def validate_csrf():
    token = request.headers.get('X-CSRF-Token')

    if not token:
        return False

    stored_token = session.get('csrf_token')

    if not stored_token:
        return False

    return secrets.compare_digest(token, stored_token)

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    normalized_filename = filename.replace('\\', '/')
    if normalized_filename.startswith('claimant/') and session.get('user_role') not in ('Admin', 'Staff'):
        return jsonify({'error': 'Unauthorized'}), 401
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/categories', methods=['GET'])
def get_categories():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM vw_categories")
        rows = cursor.fetchall()
        return jsonify(rows)

    finally:
        cursor.close()
        conn.close()

@app.route('/api/branches', methods=['GET'])
def get_branches():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        set_db_user_context(cursor)

        cursor.execute("SELECT * FROM vw_branches")
        rows = cursor.fetchall()
        return jsonify(rows)

    finally:
        cursor.close()
        conn.close()
    

@app.route('/api/locations', methods=['GET'])
def get_locations():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        set_db_user_context(cursor)

        cursor.execute("SELECT * FROM vw_locations")
        rows = cursor.fetchall()
        return jsonify(rows)

    finally:
        cursor.close()
        conn.close()

@app.route('/api/locations/by-branch/<branch_code>', methods=['GET'])
def get_locations_by_branch(branch_code):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        set_db_user_context(cursor)

        query = """
            SELECT * FROM vw_branchLocations
            WHERE branch_code = %s
            ORDER BY NAME;
        """

        cursor.execute(query, (branch_code,))
        rows = cursor.fetchall()
        return jsonify(rows)

    finally:
        cursor.close()
        conn.close()

@app.route('/api/items', methods=['POST'])
def report_item():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized. Please log in.'}), 401
    
    if not validate_csrf():
        return jsonify({'error': 'Invalid CSRF token'}), 403

    data = request.form

    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    item_type = data.get('item_type', '').lower().strip()
    item_image = request.files.get('item_image')

    # Extract date_found parameter from the frontend FormData payload
    date_found = data.get('date_found')
    if date_found and date_found.strip() == "":
        date_found = None

    # Validate required fields (Enforcing that Date Found must be filled out)
    if not name:
        return jsonify({
            'error': 'Item name is required.'
        }), 400
        
    if not date_found:
        return jsonify({
            'error': 'Date and Time Found is required.'
        }), 400

    # Validate item type
    if item_type not in ALLOWED_ITEM_TYPES:
        return jsonify({
            'error': 'Invalid item type.'
        }), 400

    # Validate description length
    if len(description) > MAX_DESCRIPTION_LENGTH:
        return jsonify({
            'error': f'Description cannot exceed {MAX_DESCRIPTION_LENGTH} characters.'
        }), 400
    
    item_file_path = None

    # Save item image
    if item_image and allowed_file(item_image.filename):
        ext = item_image.filename.rsplit('.', 1)[1].lower()
        filename = f"item_{uuid.uuid4().hex}.{ext}"
        
        # RELATIVE path (store in DB)
        item_file_path = f"items/{filename}"
        
        # ACTUAL save path
        save_path = os.path.join(UPLOAD_FOLDER, item_file_path)
        item_image.save(save_path)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        set_db_user_context(cursor)

        # Kept the same query footprint to honor the MySQL procedure blueprint setup without crashing parameter count validations
        query = """
            CALL sp_submit_report(%s, %s, %s, %s, %s, %s, %s, %s)
        """
        values = (
            name,
            description if description else None,
            item_type,
            data.get('category_code') if data.get('category_code') else None,
            data.get('branch_code') if data.get('branch_code') else None,
            data.get('location_code') if data.get('location_code') else None,
            item_file_path,
            date_found
        )
        
        cursor.execute(query, values)
        conn.commit()
        return jsonify({'message': 'Item reported successfully', 'id': cursor.lastrowid}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

@app.route('/api/search', methods=['GET'])
def search_openItems():
    unarchive_page = request.args.get('unarchive_page', '0') == '1'
    browse_all = request.args.get('browse_all', '0') == '1'

    name_q = request.args.get('name_q', '').strip()
    desc_q = request.args.get('desc_q', '').strip()
    q = request.args.get('q', '').strip()
    filter_itemType = request.args.get('filter', '').lower()
    status = request.args.get('status', 'open').lower()
    times_unclaimed = request.args.get('times_unclaimed')
    if times_unclaimed is not None:
        try:
            times_unclaimed = int(times_unclaimed)
        except ValueError:
            times_unclaimed = None

    limit = request.args.get('limit', 15, type=int)
    page = request.args.get('page', 1, type=int)
    offset = (page - 1) * limit

    category_code = request.args.get('category_code', '')
    branch_code = request.args.get('branch_code', '')
    location_code = request.args.get('location_code', '')

    if unarchive_page or status == 'closed':
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        if session.get('user_role') not in ('Admin', 'Staff'):
            return jsonify({'error': 'Forbidden'}), 403
    
    if (
        not unarchive_page and
        status != 'closed' and
        not browse_all and
        not name_q and
        not desc_q and
        not category_code and
        not branch_code and
        not location_code
    ):
        return jsonify({
            'items': [],
            'total': 0,
            'page': page,
            'limit': limit
        })

    # Determine correct SQL view
    if unarchive_page:
        if filter_itemType == 'lost':
            view_name = 'vw_archivedLost'
        elif filter_itemType == 'found':
            view_name = 'vw_archivedFound'
        else:
            view_name = 'vw_archivedAll'
    elif status == 'closed':
        if filter_itemType == 'lost':
            view_name = 'vw_closedLostItems'
        elif filter_itemType == 'found':
            view_name = 'vw_closedFoundItems'
        else:
            view_name = 'vw_closedAllItems'
    else:
        if filter_itemType == 'lost':
            view_name = 'vw_openLostItems'
        elif filter_itemType == 'found':
            view_name = 'vw_openFoundItems'
        else:
            view_name = 'vw_openAllItems'

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        base_query = f"SELECT * FROM {view_name} WHERE 1=1"
        count_query = f"SELECT COUNT(*) as total FROM {view_name} WHERE 1=1"

        params = []
        count_params = []

        # Category/Branch Filters
        if category_code:
            base_query += " AND category_code = %s"
            count_query += " AND category_code = %s"
            params.append(category_code)
            count_params.append(category_code)

        if branch_code:
            base_query += " AND branch_code = %s"
            count_query += " AND branch_code = %s"
            params.append(branch_code)
            count_params.append(branch_code)

        if location_code:
            base_query += " AND location_code = %s"
            count_query += " AND location_code = %s"
            params.append(location_code)
            count_params.append(location_code)

        # Total count query remains vanilla for accurate pagination numbers
        cursor.execute(count_query, count_params)
        total = cursor.fetchone()['total']

        # Execute base query without raw database slice parameters
        cursor.execute(base_query, params)
        items = cursor.fetchall()
        
        # 1. Compute Levenshtein similarity across ALL fetched rows matching your filters
        for item in items:
            sim_name = 0
            if name_q:
                dist_name = levenshtein_distance(name_q, item['name'])
                max_len_name = max(len(name_q), len(item['name']))
                sim_name = ((max_len_name - dist_name) / max_len_name * 100) if max_len_name > 0 else 0

            sim_desc = 0
            desc_str = item['description'] or ""
            if desc_q:
                dist_desc = levenshtein_distance(desc_q, desc_str)
                max_len_desc = max(len(desc_q), len(desc_str))
                sim_desc = ((max_len_desc - dist_desc) / max_len_desc * 100) if max_len_desc > 0 else 0
            
            item['name_relevance'] = round(sim_name) if name_q else None
            item['desc_relevance'] = round(sim_desc) if desc_q else None
            
            relevances = []
            if name_q: relevances.append(sim_name)
            if desc_q: relevances.append(sim_desc)
            item['relevance'] = round(max(relevances)) if relevances else 0
            
        # 2. Sort globally so highest percentage matching metrics sit at the very top array indices
        items.sort(key=lambda x: x['relevance'], reverse=True)
        
        # 3. Apply pagination window slicing right here in Python memory safely
        paginated_items = items[offset : offset + limit]
        
        return jsonify({
            "items": paginated_items,
            "total": total,
            "page": page,
            "limit": limit
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    # Username validation
    if not re.match(USERNAME_REGEX, username):
        return jsonify({
            'error': 'Invalid username format'
        }), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # ONLY search by username
        query = """
            SELECT * FROM vw_userLogin
            WHERE username = %s
        """

        cursor.execute(query, (username,))
        user = cursor.fetchone()

        # Check if user exists AND password hash matches
        if user:
            # find the password-like field in the returned row safely
            stored_pw = None
            for key in user.keys():
                if 'pass' in key.lower():
                    stored_pw = user[key]
                    break

            if not stored_pw:
                app.logger.error('Password field missing in vw_userLogin')
                return jsonify({'error': 'Internal Server Error'}), 500

            if bcrypt.check_password_hash(stored_pw, password):
                session.permanent = True

                session['user_id'] = user['user_id']
                session['user_code'] = user['user_code']
                session['user_role'] = user['user_role']
                session['username'] = user['username']
                csrf_token = secrets.token_hex(32)
                session['csrf_token'] = csrf_token

                return jsonify({
                    'message': 'Logged in successfully',
                    'csrf_token': csrf_token,
                    'user': {
                        'user_id': user['user_id'],
                        'user_code': user['user_code'],
                        'user_role': user['user_role'],
                        'username': user['username']
                    }
                }), 200

        return jsonify({
            'error': 'Invalid username or password'
        }), 401

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()

        if 'conn' in locals() and conn.is_connected():
            conn.close()

@app.route('/api/items/<item_code>', methods=['GET'])
def get_open_item(item_code):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM vw_openAllItems WHERE item_code = %s",
            (item_code,)
        )
        item = cursor.fetchone()
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        return jsonify(item), 200
    except Exception:
        app.logger.exception('Could not load item details')
        return jsonify({'error': 'Unable to load item details'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route('/api/logout', methods=['POST'])
def logout():

    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    if not validate_csrf():
        return jsonify({'error': 'Invalid CSRF token'}), 403
    
    session.clear()
    
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/auth-status', methods=['GET'])
def auth_status():
    if 'user_id' in session:
        return jsonify({
            'is_authenticated': True,
            'user': {
                'user_id': session['user_id'],
                'user_code': session['user_code'],
                'username': session['username'],
                'user_role': session['user_role']
            }
        }), 200
    return jsonify({'is_authenticated': False}), 200

@app.route('/api/claims', methods=['POST'])
def process_item_claim():
    # Enforce Authentication Protection
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized. Please log in to process claims.'}), 401
    
    # Enforce CSRF Protection
    if not validate_csrf():
         return jsonify({'error': 'Invalid CSRF token'}), 403
    
    data = request.form
    item_code = data.get('item_code', '').strip()
    first_name = data.get('claimer_first_name', '').strip()
    middle_name = data.get('claimer_middle_name', '').strip()
    last_name = data.get('claimer_last_name', '').strip()
    contact_number = data.get('contact_number', '').strip()
    claim_image = request.files.get('claimProof')

    # Server-Side Validation Check
    if not item_code or not first_name or not last_name or not contact_number:
        return jsonify({'error': 'Missing required claim details.'}), 400

    if not claim_image or not allowed_file(claim_image.filename):
        return jsonify({'error': 'A valid image snapshot file is required.'}), 400

    # Process image saving into your clean path formatting structure
    ext = claim_image.filename.rsplit('.', 1)[1].lower()
    unique_filename = f"claim_{uuid.uuid4().hex}.{ext}"
    
    # Store just 'claimant/filename.jpg' inside your table row
    db_relative_path = f"claimant/{unique_filename}"
    actual_save_path = os.path.join(UPLOAD_FOLDER, db_relative_path)
    claim_image.save(actual_save_path)

    # 4. Handle Database Transactions
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Enable your audit tracking log setup context if your database relies on it
        set_db_user_context(cursor)

        # Action Step A: Write data down to your claimed_items log table
        query = """
            CALL sp_insert_into_claimed_items(%s, %s, %s, %s, %s, %s)
        """
        values = (
            item_code,
            first_name,
            middle_name if middle_name else None,
            last_name,
            contact_number,
            db_relative_path
        )
        cursor.execute(query, values)
        # Commit everything to database storage safely
        conn.commit()
        return jsonify({'message': 'Claim successfully updated via stored procedure.'}), 201

    except Exception as e:
        # If anything fails, rollback database alterations instantly to protect data integrity
        if conn:
            conn.rollback()
        app.logger.exception('Claim submission failed')
        return jsonify({'message': 'Internal Server Error'}), 500

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

# This GET endpoint allows clients to retrieve claim details for a specific item code
@app.route('/api/claims/<item_code>', methods=['GET', 'OPTIONS'])
def get_item_claim_details(item_code):
    # Handle the browser preflight request instantly
    if request.method == 'OPTIONS':
        return jsonify({'status': 'CORS preflight ok'}), 200

    # Enforce standard session authorization checks
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized view request.'}), 401

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = "SELECT * FROM claimed_items WHERE item_code = %s"
        cursor.execute(query, (item_code,))
        claim_record = cursor.fetchone()

        if not claim_record:
            return jsonify({'error': 'No matching transaction logs tracking this item.'}), 404

        return jsonify(claim_record), 200

    except Exception as e:
        return jsonify({'error': f'Server pipeline tracking crash: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

# GET endpoint for unarchived item details
@app.route('/api/unarchived/<item_code>', methods=['GET', 'OPTIONS'])
def get_unarchive_details(item_code):

    # Handle browser preflight
    if request.method == 'OPTIONS':
        return jsonify({'status': 'CORS preflight ok'}), 200

    # Authentication protection
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized view request.'}), 401

    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT *
            FROM unarchived_items
            WHERE item_code = %s
        """

        cursor.execute(query, (item_code,))
        unarchive_record = cursor.fetchone()

        if not unarchive_record:
            return jsonify({
                'error': 'No matching unarchive records found.'
            }), 404

        return jsonify(unarchive_record), 200

    except Exception as e:
        return jsonify({
            'error': f'Server pipeline tracking crash: {str(e)}'
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn and conn.is_connected():
            conn.close()

@app.route('/api/items/unarchive', methods=['POST'])
def unarchive_item():
    
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized view request.'}), 401
    if not validate_csrf():
        return jsonify({'error': 'Invalid CSRF token'}), 403

    data = request.json
    item_code = data.get('item_code', '').strip()
    reason = data.get('reason', '').strip()

    if not item_code or len(reason) < 8:
        return jsonify({'error': 'A valid item code and a minimum text reason of 8 characters are required.'}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        set_db_user_context(cursor)

        query = "CALL sp_unarchive_item(%s, %s)"
        cursor.execute(query, (item_code, reason))
        conn.commit()

        return jsonify({'message': 'Item successfully restored and tracking log registered.'}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Database execution failure: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)