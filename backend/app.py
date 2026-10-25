from flask import Flask, request, jsonify, session
from flask_bcrypt import Bcrypt
from flask import send_from_directory
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import timedelta
from datetime import datetime
from threading import Lock
import mysql.connector
from flask_cors import CORS
import re
import secrets

app = Flask(__name__)
bcrypt = Bcrypt(app)

app.permanent_session_lifetime = timedelta(hours=2)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

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

# Allowed evidence types are determined from content signatures, not extensions.
ALLOWED_EVIDENCE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'}
EVIDENCE_UPLOAD_FOLDER = os.path.join(UPLOAD_FOLDER, 'evidence')
MAX_EVIDENCE_SIZE = 5 * 1024 * 1024
MAX_DESCRIPTION_LENGTH = 1000
ALLOWED_ITEM_TYPES = ['lost', 'found']
ALLOWED_PUBLIC_COLORS = {
    'Black', 'White', 'Gray', 'Silver', 'Brown', 'Beige', 'Red', 'Orange', 'Yellow',
    'Green', 'Blue', 'Purple', 'Pink', 'Gold', 'Multicolor', 'Transparent / Clear',
    'Other', 'Unknown',
}
USERNAME_REGEX = r'^[a-zA-Z0-9_]{3,20}$'
EMAIL_REGEX = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
CLAIM_RATE_LIMIT = 5
CLAIM_RATE_WINDOW_SECONDS = 60
CLAIM_RATE_LIMITS = {}
CLAIM_RATE_LIMIT_LOCK = Lock()

os.makedirs(EVIDENCE_UPLOAD_FOLDER, exist_ok=True)

def get_db_connection(**timeouts):
    return mysql.connector.connect(**db_config, connection_timeout=5, **timeouts)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EVIDENCE_EXTENSIONS


def validate_evidence_file(file_storage):
    if not file_storage or not file_storage.filename:
        return None, None

    filename = secure_filename(file_storage.filename)
    if not allowed_file(filename):
        return None, 'Evidence must be a JPG, PNG, GIF, WebP, or PDF file.'

    file_storage.stream.seek(0, os.SEEK_END)
    size = file_storage.stream.tell()
    file_storage.stream.seek(0)
    if size == 0 or size > MAX_EVIDENCE_SIZE:
        return None, 'Evidence must be between 1 byte and 5 MB.'

    content = file_storage.stream.read(512)
    file_storage.stream.seek(0)
    extension = filename.rsplit('.', 1)[1].lower()
    is_pdf = content.startswith(b'%PDF-')
    image_signatures = {
        'jpg': content.startswith(b'\xff\xd8\xff'),
        'jpeg': content.startswith(b'\xff\xd8\xff'),
        'png': content.startswith(b'\x89PNG\r\n\x1a\n'),
        'gif': content.startswith((b'GIF87a', b'GIF89a')),
        'webp': content.startswith((b'RIFF', b'WEBP')),
    }

    if extension == 'pdf' and not is_pdf:
        return None, 'The selected PDF file has an invalid signature.'
    if extension in image_signatures and not image_signatures[extension]:
        return None, 'The selected image file has an invalid signature.'
    if extension not in image_signatures and not is_pdf:
        return None, 'The selected evidence file has an invalid signature.'

    return filename, None


def save_evidence_file(file_storage):
    filename, error = validate_evidence_file(file_storage)
    if error:
        return None, error
    if filename is None:
        return None, None

    extension = filename.rsplit('.', 1)[1].lower()
    unique_filename = f"claim_{uuid.uuid4().hex}.{extension}"
    actual_path = os.path.join(EVIDENCE_UPLOAD_FOLDER, unique_filename)
    file_storage.save(actual_path)
    return f"evidence/{unique_filename}", None


def is_staff():
    return session.get('user_role') in ('Admin', 'Staff') and 'user_id' in session


def require_staff():
    if not is_staff():
        return jsonify({'error': 'Admin or Staff access is required.'}), 403
    return None


def check_claim_rate_limit(ip_address):
    now = datetime.now().timestamp()
    with CLAIM_RATE_LIMIT_LOCK:
        window_start = now - CLAIM_RATE_WINDOW_SECONDS
        attempts = [attempt for attempt in CLAIM_RATE_LIMITS.get(ip_address, []) if attempt > window_start]
        if len(attempts) >= CLAIM_RATE_LIMIT:
            return False
        attempts.append(now)
        CLAIM_RATE_LIMITS[ip_address] = attempts
    return True


def public_item_row(row):
    return {
        'item_code': row['item_code'],
        'item_type': row['item_type'],
        'status': row['status'],
        'categoryName': row['categoryName'],
        'public_color': row.get('public_color'),
        'branchName': row['branchName'],
        'date_found': row['date_found'],
        'date_reported': row['date_reported'],
        'can_claim': row['status'] == 'Available',
    }

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
    if normalized_filename.startswith('evidence/') and not is_staff():
        return jsonify({'error': 'Unauthorized'}), 403
    if normalized_filename.startswith('claimant/') and not is_staff():
        return jsonify({'error': 'Unauthorized'}), 403
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
    public_color = data.get('public_color', 'Unknown').strip()
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

    if public_color not in ALLOWED_PUBLIC_COLORS:
        return jsonify({
            'error': 'Invalid public color.'
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

        query = """
            CALL sp_submit_report(%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        values = (
            name,
            description if description else None,
            item_type,
            data.get('category_code') if data.get('category_code') else None,
            data.get('branch_code') if data.get('branch_code') else None,
            data.get('location_code') if data.get('location_code') else None,
            item_file_path,
            date_found,
            public_color,
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
        
        public_items = []
        for item in items:
            searchable_text = ' '.join(
                str(value).lower()
                for value in (
                    item.get('categoryName'),
                    item.get('public_color'),
                    item.get('branchName'),
                    item.get('item_type'),
                    item.get('item_code'),
                )
                if value
            )
            score = 0
            if name_q:
                score = max(score, 100 - levenshtein_distance(name_q, searchable_text))
            if desc_q:
                score = max(score, 100 - levenshtein_distance(desc_q, searchable_text))
            public_items.append((public_item_row(item), score))

        public_items.sort(key=lambda pair: pair[1], reverse=True)
        paginated_items = [item for item, _ in public_items[offset : offset + limit]]

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
            "SELECT item_code, item_type, status, category_code, categoryName, public_color, branch_code, branchName, date_found, date_reported FROM vw_openAllItems WHERE item_code = %s",
            (item_code,)
        )
        item = cursor.fetchone()
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        return jsonify(public_item_row(item)), 200
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

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200


@app.route('/api/ready', methods=['GET'])
def readiness():
    connection = None
    cursor = None
    try:
        connection = get_db_connection(read_timeout=5, write_timeout=5)
        cursor = connection.cursor()
        cursor.execute('SELECT 1')
        cursor.fetchone()
        return jsonify({'status': 'ready'}), 200
    except mysql.connector.Error:
        return jsonify({'status': 'unavailable'}), 503
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


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

def claim_database_error(error):
    """Translate expected lifecycle conflicts without exposing database internals."""
    code = getattr(error, 'errno', None)
    if code == 30001 or (code == 1062 and 'uq_claim_active_item' in str(error)):
        return jsonify({'error': 'An active claim already exists for this item.'}), 409
    if code == 30002:
        return jsonify({'error': 'Item not found.'}), 404
    if code in (30003, 30004):
        return jsonify({'error': getattr(error, 'msg', 'This item is no longer available.')}), 409
    return None


@app.route('/api/claims', methods=['POST'])
def process_item_claim():
    if 'user_id' in session:
        return jsonify({'error': 'Sign out to submit a public claim.'}), 403

    if not check_claim_rate_limit(request.remote_addr or 'unknown'):
        return jsonify({'error': 'Too many claim attempts. Please wait a minute and try again.'}), 429

    if request.is_json:
        data = request.get_json(silent=True)
        if not isinstance(data, dict) or any(not isinstance(value, str) for value in data.values()):
            return jsonify({'error': 'Claim fields must be text values.'}), 400
    else:
        data = request.form
    item_code = (data.get('item_code') or '').strip()
    first_name = (data.get('claimer_first_name') or '').strip()
    middle_name = (data.get('claimer_middle_name') or '').strip()
    last_name = (data.get('claimer_last_name') or '').strip()
    contact_number = (data.get('contact_number') or '').strip()
    claimant_email = (data.get('claimant_email') or '').strip().lower()
    affiliation = (data.get('claimant_affiliation') or '').strip()
    last_seen_location = (data.get('last_seen_location') or '').strip()
    last_seen_date_time = (data.get('last_seen_date_time') or '').strip()
    item_description = (data.get('item_description') or '').strip()
    identifying_features = (data.get('identifying_features') or '').strip()
    contents = (data.get('contents') or '').strip()
    additional_evidence = (data.get('additional_evidence') or '').strip()
    evidence = request.files.get('evidence')

    errors = []
    if not item_code or len(item_code) > 15:
        errors.append('A valid item reference is required.')
    if not first_name or len(first_name) > 50 or not last_name or len(last_name) > 50:
        errors.append('First and last names are required.')
    if len(middle_name) > 50:
        errors.append('The middle name is too long.')
    if not contact_number or len(contact_number) > 20:
        errors.append('A contact number is required.')
    if not re.match(EMAIL_REGEX, claimant_email) or len(claimant_email) > 254:
        errors.append('A valid email address is required.')
    if affiliation not in ('Student', 'Faculty', 'Staff', 'Visitor'):
        errors.append('A valid affiliation is required.')
    if not item_description or len(item_description) > 1000:
        errors.append('An item description is required.')
    if not identifying_features or len(identifying_features) > 1000:
        errors.append('Identifying features are required.')
    if len(last_seen_location) > 255 or len(contents) > 1000 or len(additional_evidence) > 1000:
        errors.append('One or more evidence fields are too long.')

    normalized_date_time = None
    if last_seen_date_time:
        try:
            normalized_date_time = datetime.strptime(last_seen_date_time, '%Y-%m-%dT%H:%M')
        except ValueError:
            errors.append('The last-seen date and time must use the YYYY-MM-DDTHH:MM format.')

    evidence_path = None
    if evidence:
        evidence_path, evidence_error = save_evidence_file(evidence)
        if evidence_error:
            errors.append(evidence_error)

    if errors:
        if evidence_path:
            try:
                os.remove(os.path.join(app.config['UPLOAD_FOLDER'], evidence_path))
            except OSError:
                pass
        return jsonify({'error': ' '.join(errors)}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "CALL sp_insert_into_claimed_items(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                item_code,
                first_name,
                middle_name or None,
                last_name,
                contact_number,
                claimant_email,
                affiliation,
                last_seen_location or None,
                normalized_date_time,
                item_description,
                identifying_features,
                contents or None,
                additional_evidence or None,
                evidence_path,
            ),
        )
        conn.commit()
        return jsonify({'message': 'Claim submitted for staff review.', 'item_code': item_code}), 201
    except Exception as error:
        if conn:
            conn.rollback()
        if evidence_path:
            try:
                os.remove(os.path.join(app.config['UPLOAD_FOLDER'], evidence_path))
            except OSError:
                pass
        conflict = claim_database_error(error)
        if conflict:
            return conflict
        app.logger.exception('Claim submission failed')
        return jsonify({'error': 'Unable to save the claim. Please try again.'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route('/api/claims', methods=['GET'])
def get_claim_queue():
    error_response = require_staff()
    if error_response:
        return error_response

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT claimed_item_id, claimed_item_code, item_code, claimer_first_name, claimer_last_name, contact_number, claimant_email, claimant_affiliation, status, date_claimed, date_updated FROM claimed_items ORDER BY date_claimed DESC"
        )
        return jsonify({'claims': cursor.fetchall()}), 200
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.route('/api/claims/<item_code>', methods=['GET'])
@app.route('/api/claim-records/<int:claim_id>', methods=['GET'])
def get_claim_details(item_code=None, claim_id=None):
    error_response = require_staff()
    if error_response:
        return error_response

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT c.*, i.NAME AS item_name, i.DESCRIPTION AS item_description_private, i.item_type, i.STATUS AS item_status, i.location_code, i.item_file_path, i.public_color FROM claimed_items AS c JOIN items AS i ON i.item_code = c.item_code WHERE " + ("c.claimed_item_id = %s" if claim_id is not None else "c.item_code = %s") + " ORDER BY c.claimed_item_id DESC LIMIT 1",
            (claim_id if claim_id is not None else item_code,),
        )
        claim = cursor.fetchone()
        if not claim:
            return jsonify({'error': 'Claim not found'}), 404
        return jsonify(claim), 200
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.route('/api/claims/<item_code>/status', methods=['PATCH'])
@app.route('/api/claim-records/<int:claim_id>/status', methods=['PATCH'])
def update_claim_status(item_code=None, claim_id=None):
    error_response = require_staff()
    if error_response:
        return error_response
    if not validate_csrf():
        return jsonify({'error': 'Invalid CSRF token'}), 403
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Claim review must be a JSON object.'}), 400
    status, notes = data.get('status'), data.get('notes')
    transitions = {
        'Pending': {'Pending', 'Under Review', 'Approved', 'Rejected'},
        'Under Review': {'Pending', 'Under Review', 'Approved', 'Rejected'},
        'Approved': {'Approved', 'Returned'},
        'Rejected': {'Rejected'},
        'Returned': {'Returned', 'Approved'},
    }
    if status not in transitions:
        return jsonify({'error': 'Invalid claim status.'}), 400
    if notes is not None and (not isinstance(notes, str) or len(notes) > 2000):
        return jsonify({'error': 'Staff notes must be text no longer than 2000 characters.'}), 400
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        # Resolve the item first; submissions and reviews always lock the item before the claim.
        if claim_id is not None:
            cursor.execute('SELECT item_code FROM claimed_items WHERE claimed_item_id=%s', (claim_id,))
            reference = cursor.fetchone()
            if not reference:
                return jsonify({'error': 'Claim not found'}), 404
            item_code = reference['item_code']
        cursor.execute('SELECT STATUS, close_at > NOW() AS unexpired FROM items WHERE item_code=%s FOR UPDATE', (item_code,))
        item = cursor.fetchone()
        cursor.execute('SELECT claimed_item_id,status FROM claimed_items WHERE ' +
                       ('claimed_item_id=%s' if claim_id is not None else 'item_code=%s') +
                       ' ORDER BY claimed_item_id DESC LIMIT 1 FOR UPDATE',
                       (claim_id if claim_id is not None else item_code,))
        claim = cursor.fetchone()
        if not claim or not item:
            return jsonify({'error': 'Claim not found'}), 404
        if status not in transitions[claim['status']]:
            return jsonify({'error': 'This claim decision is final. Review the current active claim instead.'}), 409
        if status == 'Approved' and claim['status'] not in ('Approved', 'Returned') and (item['STATUS'] != 'open' or not item['unexpired']):
            return jsonify({'error': 'This item has expired and cannot be approved.'}), 409
        cursor.execute('UPDATE claimed_items SET status=%s, staff_notes=COALESCE(%s,staff_notes), date_updated=CURRENT_TIMESTAMP WHERE claimed_item_id=%s',
                       (status, notes, claim['claimed_item_id']))
        conn.commit()
        return jsonify({'message': 'Claim status updated.'}), 200
    except Exception as error:
        if conn:
            conn.rollback()
        conflict = claim_database_error(error)
        if conflict:
            return conflict
        app.logger.exception('Claim review failed')
        return jsonify({'error': 'Unable to update the claim. Please try again.'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.route('/api/claims/<item_code>/evidence', methods=['GET'])
@app.route('/api/claim-records/<int:claim_id>/evidence', methods=['GET'])
def get_claim_evidence(item_code=None, claim_id=None):
    error_response = require_staff()
    if error_response:
        return error_response

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT evidence_file_path FROM claimed_items WHERE ' + ('claimed_item_id=%s' if claim_id is not None else 'item_code=%s') + ' ORDER BY claimed_item_id DESC LIMIT 1', (claim_id if claim_id is not None else item_code,))
        claim = cursor.fetchone()
        if not claim or not claim['evidence_file_path']:
            return jsonify({'error': 'No evidence is attached.'}), 404
        return send_from_directory(app.config['UPLOAD_FOLDER'], claim['evidence_file_path'])
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
            WHERE item_code = %s ORDER BY unarchived_item_id DESC LIMIT 1
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
        conflict = claim_database_error(e)
        if conflict:
            return conflict
        app.logger.exception('Item restore failed')
        return jsonify({'error': 'Unable to restore this item. Please try again.'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)