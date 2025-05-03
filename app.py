import os
import json
import secrets
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, make_response, session
from flask_wtf.csrf import CSRFProtect
from dotenv import load_dotenv
import requests
from datetime import datetime, timedelta
from dateutil import parser
import traceback

# Conditionally import pyngrok
ngrok_available = False
try:
    from pyngrok import ngrok, conf
    ngrok_available = True
except ImportError:
    pass

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev_key')
# Session config - set longer lifetime for OAuth tokens
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
csrf = CSRFProtect(app)

# Configure ngrok (if in development and available)
NGROK_ENABLED = False  # Disable by default to avoid conflicts
NGROK_AUTH_TOKEN = os.getenv('NGROK_AUTH_TOKEN', None)
ngrok_tunnel_url = None

if NGROK_ENABLED and ngrok_available:
    try:
        # Set ngrok auth token if provided
        if NGROK_AUTH_TOKEN:
            conf.get_default().auth_token = NGROK_AUTH_TOKEN
        
        # Open a tunnel on the default port
        port = int(os.getenv('PORT', 5000))
        public_url = ngrok.connect(port).public_url
        ngrok_tunnel_url = public_url
        app.logger.info(f"* ngrok tunnel available at: {public_url}")
    except Exception as e:
        app.logger.error(f"Failed to start ngrok: {str(e)}")
        app.logger.error("To use ngrok: sign up at ngrok.com, get your auth token, and add it to .env")
        app.logger.error("If you already have ngrok running, set ENABLE_NGROK=False in .env")
        ngrok_tunnel_url = None

# OAuth configuration
LINEAR_CLIENT_ID = os.getenv('LINEAR_CLIENT_ID')
LINEAR_CLIENT_SECRET = os.getenv('LINEAR_CLIENT_SECRET')

# Check if we're running on Render
is_render = os.getenv('RENDER', False)
render_service_name = os.getenv('RENDER_SERVICE_NAME', '')
render_external_url = os.getenv('RENDER_EXTERNAL_URL', '')

# Use appropriate redirect URI based on environment
if render_external_url:
    LINEAR_REDIRECT_URI = f"{render_external_url}/auth/callback"
    app.logger.info(f"Running on Render, using redirect URI: {LINEAR_REDIRECT_URI}")
else:
    LINEAR_REDIRECT_URI = os.getenv('LINEAR_REDIRECT_URI', 'http://localhost:5000/auth/callback')
    if ngrok_tunnel_url:
        LINEAR_REDIRECT_URI = f"{ngrok_tunnel_url}/auth/callback"
        
LINEAR_API_KEY = os.getenv('LINEAR_API_KEY')

# Output configuration for debugging
app.logger.info(f"OAuth Redirect URI: {LINEAR_REDIRECT_URI}")

# Linear API URL
LINEAR_API_URL = 'https://api.linear.app/graphql'

# Configure global error handlers to return JSON for API routes
@app.errorhandler(400)
def handle_bad_request(e):
    """Ensure 400 errors return JSON for API routes"""
    if request.path.startswith('/api/'):
        app.logger.error(f"400 error on {request.path}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e) or 'Bad request',
            'path': request.path
        }), 400
    # For non-API routes, let Flask handle the error normally
    return e

@app.errorhandler(404)
def handle_not_found(e):
    """Ensure 404 errors return JSON for API routes"""
    if request.path.startswith('/api/'):
        return jsonify({
            'success': False,
            'error': 'Not found',
            'path': request.path
        }), 404
    # For non-API routes, let Flask handle the error normally
    return e

@app.errorhandler(500)
def handle_server_error(e):
    """Ensure 500 errors return JSON for API routes"""
    if request.path.startswith('/api/'):
        app.logger.error(f"500 error on {request.path}: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}',
            'path': request.path
        }), 500
    # For non-API routes, let Flask handle the error normally
    return e

# Properly exempt API routes from CSRF protection
@csrf.exempt
@app.route('/api/update_issue/<issue_id>', methods=['POST'])
def api_update_issue(issue_id):
    try:
        # Ensure JSON content-type
        if not request.is_json:
            response = jsonify({
                'success': False, 
                'error': 'Content-Type must be application/json'
            })
            response.headers['Content-Type'] = 'application/json'
            return response, 400
            
        data = request.json
        if not data:
            response = jsonify({
                'success': False, 
                'error': 'No data provided'
            })
            response.headers['Content-Type'] = 'application/json'
            return response, 400
            
        update_data = {}
        
        if 'title' in data:
            update_data['title'] = data['title']
        
        if 'description' in data:
            update_data['description'] = data['description']
        
        if 'stateId' in data:
            update_data['stateId'] = data['stateId']
        
        if 'assigneeId' in data:
            update_data['assigneeId'] = data['assigneeId'] if data['assigneeId'] else None
        
        if not update_data:
            response = jsonify({
                'success': False, 
                'error': 'No valid fields to update'
            })
            response.headers['Content-Type'] = 'application/json'
            return response, 400
        
        app.logger.info(f"Processing update for issue {issue_id} with data: {json.dumps(update_data)}")
        
        success, error_message = update_issue(issue_id, update_data)
        
        if success:
            response = jsonify({'success': True})
            response.headers['Content-Type'] = 'application/json'
            return response
        else:
            app.logger.error(f"Failed to update issue: {error_message}")
            response = jsonify({
                'success': False, 
                'error': error_message
            })
            response.headers['Content-Type'] = 'application/json'
            return response, 400
    except Exception as e:
        app.logger.error(f"Unexpected error in api_update_issue: {str(e)}", exc_info=True)
        response = jsonify({
            'success': False, 
            'error': f"Server error: {str(e)}"
        })
        response.headers['Content-Type'] = 'application/json'
        return response, 500

# Disable CSRF for API routes
@csrf.exempt
@app.route('/api/add_comment/<issue_id>', methods=['POST'])
def api_add_comment(issue_id):
    try:
        # Ensure JSON content-type
        if not request.is_json:
            response = jsonify({
                'success': False, 
                'error': 'Content-Type must be application/json'
            })
            response.headers['Content-Type'] = 'application/json'
            return response, 400
            
        data = request.json
        comment = data.get('comment', '')
        
        if not comment:
            response = jsonify({
                'success': False, 
                'error': 'Comment is required'
            })
            response.headers['Content-Type'] = 'application/json'
            return response, 400
        
        # Check if user is authenticated
        user = session.get('user')
        access_token = None
        if user and user.get('access_token'):
            access_token = user.get('access_token')
            app.logger.info(f"Adding comment as authenticated user: {user.get('name')}")
        else:
            app.logger.info(f"Adding comment using API key (no authenticated user)")
        
        app.logger.info(f"Attempting to add comment to issue {issue_id}")
        
        # First verify the issue exists and get the correct ID format
        verify_query = """
        query VerifyIssue($id: String!) {
            issue(id: $id) {
                id
                identifier
                title
            }
        }
        """
        
        verify_vars = {"id": issue_id}
        verify_result = execute_query(verify_query, verify_vars, access_token)
        
        # Log the verification
        app.logger.info(f"Issue verification: {json.dumps(verify_result)}")
        
        if not verify_result or 'data' not in verify_result or not verify_result['data'].get('issue'):
            response = jsonify({
                'success': False, 
                'error': f"Issue with ID {issue_id} not found"
            })
            response.headers['Content-Type'] = 'application/json'
            return response, 404
        
        # Get the internal ID
        internal_id = verify_result['data']['issue']['id']
        
        # Standard comment creation mutation based on Linear docs
        mutation = """
        mutation CommentCreate($input: CommentCreateInput!) {
            commentCreate(input: $input) {
                success
                comment {
                    id
                    body
                    user {
                        id
                        name
                        displayName
                    }
                    createdAt
                }
            }
        }
        """
        
        variables = {
            "input": {
                "issueId": internal_id,
                "body": comment
            }
        }
        
        # Log the mutation and variables for debugging
        app.logger.info(f"Comment mutation: {mutation}")
        app.logger.info(f"Comment variables: {json.dumps(variables)}")
        
        # Execute the comment creation query with user token if available
        result = execute_query(mutation, variables, access_token)
        
        # Log the full result
        app.logger.info(f"Comment creation result: {json.dumps(result)}")
        
        # Check for GraphQL errors
        if result and 'errors' in result:
            error_messages = [error.get('message', 'Unknown error') for error in result['errors']]
            error_message = '; '.join(error_messages)
            app.logger.error(f"GraphQL errors: {error_message}")
            
            # Check for specific permission errors
            for error in result['errors']:
                if 'PERMISSION' in error.get('message', '').upper():
                    app.logger.error("This appears to be a permissions issue with the API key")
                elif 'NOT_AUTHORIZED' in error.get('extensions', {}).get('type', ''):
                    app.logger.error("Not authorized - check API key permissions")
                elif 'INVALID_TOKEN' in error.get('message', '').upper() and access_token:
                    # Try to refresh token if it's invalid
                    if user and user.get('refresh_token'):
                        app.logger.info("Token appears invalid, attempting to refresh...")
                        token_data = refresh_access_token(user['refresh_token'])
                        if token_data and 'access_token' in token_data:
                            # Update session with new tokens
                            user['access_token'] = token_data['access_token']
                            if 'refresh_token' in token_data:
                                user['refresh_token'] = token_data['refresh_token']
                            session['user'] = user
                            
                            # Try again with new token
                            app.logger.info("Retrying with refreshed token")
                            result = execute_query(mutation, variables, user['access_token'])
                            
                            # If still errors, fall back to API key
                            if result and 'errors' in result:
                                app.logger.warning("Still getting errors after token refresh, falling back to API key")
                                result = execute_query(mutation, variables)
            
            # If still errors after all attempts, return error
            if result and 'errors' in result:
                response = jsonify({
                    'success': False,
                    'error': f"Linear API error: {error_message}",
                    'errors': result['errors']
                })
                response.headers['Content-Type'] = 'application/json'
                return response, 400
        
        # Check if the comment was created successfully
        if result and 'data' in result and 'commentCreate' in result['data'] and result['data']['commentCreate'].get('success'):
            app.logger.info("Comment created successfully!")
            comment_id = None
            if 'comment' in result['data']['commentCreate'] and 'id' in result['data']['commentCreate']['comment']:
                comment_id = result['data']['commentCreate']['comment']['id']
                
            response = jsonify({
                'success': True,
                'commentId': comment_id
            })
            response.headers['Content-Type'] = 'application/json'
            return response
        else:
            app.logger.error(f"Comment creation failed without GraphQL errors")
            response = jsonify({
                'success': False, 
                'error': 'Failed to create comment', 
                'response': result
            })
            response.headers['Content-Type'] = 'application/json'
            return response, 400
            
    except Exception as e:
        app.logger.error(f"Exception in comment creation: {str(e)}")
        response = jsonify({
            'success': False, 
            'error': f"Exception: {str(e)}"
        })
        response.headers['Content-Type'] = 'application/json'
        return response, 500

# Linear API helper functions
def execute_query(query, variables=None, access_token=None):
    """Execute a GraphQL query against the Linear API
    
    If access_token is provided, use that for authentication (OAuth)
    Otherwise, use the app's API key
    """
    # Determine the correct Authorization header format
    if access_token:
        # Use the provided OAuth token
        auth_header = f"Bearer {access_token}"
        auth_type = "OAuth Token"
    else:
        # Use the app's API key 
        if LINEAR_API_KEY and LINEAR_API_KEY.startswith('lin_'):
            # This is a personal API key, use as is
            auth_header = LINEAR_API_KEY
            auth_type = "Personal API Key"
        else:
            # Assume this is an OAuth token, add Bearer prefix
            auth_header = f"Bearer {LINEAR_API_KEY}"
            auth_type = "OAuth Token"
    
    headers = {
        'Authorization': auth_header,
        'Content-Type': 'application/json'
    }
    
    payload = {
        'query': query,
        'variables': variables or {}
    }
    
    app.logger.info(f"Executing Linear API query with auth type: {auth_type}")
    
    response = requests.post(LINEAR_API_URL, json=payload, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        app.logger.error(f"API Error: {response.status_code} - {response.text}")
        return None

def get_teams():
    """Get all teams from Linear"""
    query = """
    query Teams {
        teams {
            nodes {
                id
                name
            }
        }
    }
    """
    
    result = execute_query(query)
    if result and 'data' in result and 'teams' in result['data']:
        return result['data']['teams']['nodes']
    return []

def get_projects(team_id=None):
    """Get projects, optionally filtered by team"""
    # First get all projects without filtering
    query = """
    query Projects {
        projects {
            nodes {
                id
                name
                lead {
                    id
                    name
                }
                teams {
                    nodes {
                        id
                        name
                    }
                }
            }
        }
    }
    """
    
    result = execute_query(query)
    projects = []
    
    if result and 'data' in result and 'projects' in result['data']:
        all_projects = result['data']['projects']['nodes']
        
        # If team_id is provided, filter projects by team
        if team_id:
            for project in all_projects:
                if 'teams' in project and 'nodes' in project['teams']:
                    for team in project['teams']['nodes']:
                        if team['id'] == team_id:
                            # Add teamId property for compatibility with templates
                            project['teamId'] = team_id
                            projects.append(project)
                            break
        else:
            projects = all_projects
            
    return projects

def get_workflow_states(team_id):
    """Get workflow states (columns) for a team"""
    query = """
    query WorkflowStates($teamId: String!) {
        team(id: $teamId) {
            states {
                nodes {
                    id
                    name
                    color
                    position
                    type
                }
            }
        }
    }
    """
    
    variables = {"teamId": team_id}
    result = execute_query(query, variables)
    
    if result and 'data' in result and 'team' in result['data'] and 'states' in result['data']['team']:
        states = result['data']['team']['states']['nodes']
        
        # Get a snapshot of states for debugging
        app.logger.info(f"Workflow states before sorting: {json.dumps(states)}")
        
        # Classify each state based on Linear's state types and fallback to position
        for state in states:
            state_type = state.get('type', '').lower()
            
            # Use Linear's standard state types directly
            if state_type == 'backlog':
                group_order = 0
            elif state_type == 'unstarted':
                group_order = 1
            elif state_type == 'started':
                group_order = 2
            elif state_type == 'completed':
                group_order = 3
            elif state_type == 'canceled':
                group_order = 4
            else:
                # For unknown types, use position as last resort
                position = float(state.get('position', 0))
                # Normalize position to a 0-4 scale
                total_states = len(states)
                if total_states > 1:
                    # Find relative position in the sequence
                    sorted_positions = sorted([float(s.get('position', 0)) for s in states])
                    position_index = sorted_positions.index(position)
                    group_order = min(4, int(position_index * 5 / total_states))
                else:
                    group_order = 1  # Default to unstarted for a single state
            
            state['group_order'] = group_order
            
        # Sort by group order first, then by position within group
        sorted_states = sorted(states, key=lambda x: (
            x.get('group_order', 99),
            float(x.get('position', 0))
        ))
        
        # Log the sorted result
        app.logger.info(f"Workflow states after sorting: {json.dumps(sorted_states)}")
        
        return sorted_states
    return []

def get_issues(team_id, project_id=None):
    """Get issues for a team, optionally filtered by project"""
    query = """
    query Issues($teamId: ID!, $projectId: ID) {
        issues(
            filter: { 
                team: { id: { eq: $teamId } }
                project: { id: { eq: $projectId } }
            }
        ) {
            nodes {
                id
                identifier
                title
                description
                state {
                    id
                    name
                    color
                }
                assignee {
                    id
                    name
                    displayName
                }
                createdAt
                updatedAt
            }
        }
    }
    """
    
    variables = {"teamId": team_id}
    if project_id:
        variables["projectId"] = project_id
    
    result = execute_query(query, variables)
    if result and 'data' in result and 'issues' in result['data']:
        return result['data']['issues']['nodes']
    return []

def get_issue_comments(issue_id):
    """Get comments for an issue"""
    query = """
    query IssueComments($issueId: String!) {
        issue(id: $issueId) {
            comments {
                nodes {
                    id
                    body
                    user {
                        name
                        displayName
                    }
                    createdAt
                }
            }
        }
    }
    """
    
    variables = {"issueId": issue_id}
    result = execute_query(query, variables)
    
    if result and 'data' in result and 'issue' in result['data'] and 'comments' in result['data']['issue']:
        return result['data']['issue']['comments']['nodes']
    return []

def add_comment_to_issue(issue_id, comment):
    """Add a comment to an issue"""
    
    # First attempt: Use the basic mutation structure
    mutation = """
    mutation CommentCreate($issueId: String!, $body: String!) {
        commentCreate(input: {
            issueId: $issueId,
            body: $body
        }) {
            success
            comment {
                id
                body
                user {
                    id
                    name
                    displayName
                }
                createdAt
            }
        }
    }
    """
    
    variables = {
        "issueId": issue_id,
        "body": comment
    }
    
    app.logger.info(f"Attempting comment creation with mutation 1")
    
    # Try the first mutation attempt
    result = execute_query(mutation, variables)
    
    # Check if the first attempt succeeded
    if result and 'data' in result and 'commentCreate' in result['data'] and result['data']['commentCreate'].get('success'):
        app.logger.info("Comment creation successful with first attempt")
        return True
        
    # If first attempt failed, log error details
    if result and 'errors' in result:
        app.logger.error(f"First attempt errors: {json.dumps(result['errors'])}")
    
    # Second attempt: Try the official Linear SDK example format
    mutation2 = """
    mutation CreateComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
            success
            comment {
                id
                body
                user {
                    id
                    name
                    displayName
                }
                createdAt
            }
        }
    }
    """
    
    variables2 = {
        "input": {
            "issueId": issue_id,
            "body": comment
        }
    }
    
    app.logger.info(f"Attempting comment creation with mutation 2")
    
    # Try the second mutation attempt
    result2 = execute_query(mutation2, variables2)
    
    # Check if the second attempt succeeded
    if result2 and 'data' in result2 and 'commentCreate' in result2['data'] and result2['data']['commentCreate'].get('success'):
        app.logger.info("Comment creation successful with second attempt")
        return True
        
    # If second attempt also failed, log errors and try direct HTTP approach
    if result2 and 'errors' in result2:
        app.logger.error(f"Second attempt errors: {json.dumps(result2['errors'])}")
    
    # Fallback attempt: Try a direct HTTP request with minimal structure
    try:
        app.logger.info("Trying fallback direct HTTP approach")
        
        # Make a direct HTTP request
        headers = {
            'Authorization': LINEAR_API_KEY,
            'Content-Type': 'application/json'
        }
        
        # Create the simplest possible payload
        payload = {
            'query': """
            mutation {
                commentCreate(input: { 
                    issueId: "%s", 
                    body: "%s" 
                }) { 
                    success 
                    comment {
                        id
                        body
                        user {
                            id
                            name
                            displayName
                        }
                        createdAt
                    }
                }
            }
            """ % (issue_id, comment.replace('"', '\\"').replace('\n', '\\n'))
        }
        
        # Log the direct request for debugging
        app.logger.info(f"Direct request payload: {json.dumps(payload)}")
        
        # Execute the direct request
        response = requests.post(LINEAR_API_URL, json=payload, headers=headers)
        
        # Log the response
        app.logger.info(f"Direct request response: {response.status_code}")
        app.logger.info(f"Direct request response body: {response.text}")
        
        # Check if the direct request succeeded
        result3 = response.json()
        if response.status_code == 200 and 'data' in result3 and 'commentCreate' in result3['data'] and result3['data']['commentCreate'].get('success'):
            app.logger.info("Comment creation successful with direct HTTP approach")
            return True
            
        return False
    except Exception as e:
        app.logger.error(f"Exception in direct HTTP approach: {str(e)}")
        return False

def update_issue(issue_id, data):
    """Update an issue with the given data"""
    try:
        app.logger.info(f"Attempting to update issue {issue_id} with data: {json.dumps(data)}")
        
        # First, verify the issue exists
        verify_query = """
        query VerifyIssue($id: String!) {
            issue(id: $id) {
                id
                identifier
                title
            }
        }
        """
        
        verify_vars = {"id": issue_id}
        verify_result = execute_query(verify_query, verify_vars)
        
        # Log the verification result
        app.logger.info(f"Issue verification: {json.dumps(verify_result)}")
        
        if not verify_result or 'data' not in verify_result or not verify_result['data'].get('issue'):
            app.logger.error(f"Issue with ID {issue_id} could not be verified")
            return False, "Issue not found"
        
        # Standard issue update mutation
        mutation = """
        mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
            issueUpdate(id: $id, input: $input) {
                success
                issue {
                    id
                    title
                    description
                    state {
                        id
                        name
                    }
                }
            }
        }
        """
        
        variables = {
            "id": issue_id,
            "input": data
        }
        
        # Log the mutation and variables
        app.logger.info(f"Update mutation: {mutation}")
        app.logger.info(f"Update variables: {json.dumps(variables)}")
        
        # Execute the update query
        result = execute_query(mutation, variables)
        
        # Log the full result
        app.logger.info(f"Update result: {json.dumps(result)}")
        
        if result and 'errors' in result:
            error_messages = [error.get('message', 'Unknown error') for error in result['errors']]
            error_message = '; '.join(error_messages)
            app.logger.error(f"GraphQL errors: {error_message}")
            return False, error_message
        
        return (result and 'data' in result and 
                'issueUpdate' in result['data'] and 
                result['data']['issueUpdate'].get('success')), None
    except Exception as e:
        app.logger.error(f"Exception updating issue: {str(e)}")
        return False, f"Exception: {str(e)}"

# Routes
@app.route('/')
def index():
    teams = get_teams()
    return render_template('index.html', teams=teams)

@app.route('/projects')
def projects():
    team_id = request.args.get('team_id')
    if not team_id:
        flash('Please select a team first')
        return redirect(url_for('index'))
    
    projects = get_projects(team_id)
    return render_template('projects.html', team_id=team_id, projects=projects)

@app.route('/roadmap')
def roadmap():
    team_id = request.args.get('team_id')
    project_id = request.args.get('project_id')
    
    if not team_id:
        flash('Please select a team first')
        return redirect(url_for('index'))
    
    workflow_states = get_workflow_states(team_id)
    issues = get_issues(team_id, project_id)
    
    # Group issues by workflow state
    issues_by_state = {}
    for state in workflow_states:
        issues_by_state[state['id']] = []
    
    for issue in issues:
        state_id = issue['state']['id']
        if state_id in issues_by_state:
            issues_by_state[state_id].append(issue)
    
    return render_template(
        'roadmap.html', 
        team_id=team_id, 
        project_id=project_id, 
        workflow_states=workflow_states, 
        issues_by_state=issues_by_state
    )

@app.route('/issue/<issue_id>')
def issue_details(issue_id):
    # Get issue details
    query = """
    query Issue($id: String!) {
        issue(id: $id) {
            id
            identifier
            title
            description
            state {
                id
                name
            }
            assignee {
                id
                name
                displayName
            }
            team {
                id
                name
                states {
                    nodes {
                        id
                        name
                    }
                }
                members {
                    nodes {
                        id
                        name
                        displayName
                    }
                }
            }
            comments {
                nodes {
                    id
                    body
                    createdAt
                }
            }
        }
    }
    """
    
    variables = {"id": issue_id}
    result = execute_query(query, variables)
    
    if result and 'data' in result and 'issue' in result['data']:
        issue = result['data']['issue']
        team_members = []
        
        if issue['team'] and 'members' in issue['team']:
            team_members = issue['team']['members']['nodes']
        
        workflow_states = []
        if issue['team'] and 'states' in issue['team']:
            workflow_states = issue['team']['states']['nodes']
        
        return render_template(
            'issue_details.html', 
            issue=issue, 
            team_members=team_members,
            workflow_states=workflow_states
        )
    
    flash('Issue not found')
    return redirect(url_for('index'))

@app.template_filter('format_date')
def format_date(date_str):
    """Format a date string for display"""
    if not date_str:
        return ''
    
    dt = parser.parse(date_str)
    return dt.strftime('%Y-%m-%d %H:%M')

@csrf.exempt
@app.route('/api/test_linear')
def test_linear_api():
    """Diagnostic route to test Linear API access"""
    results = {}
    
    # Test 1: Viewer access (read)
    viewer_query = """query { viewer { id name } }"""
    viewer_result = execute_query(viewer_query)
    results['viewer_access'] = bool(viewer_result and 'data' in viewer_result and 'viewer' in viewer_result['data'])
    
    # Test 2: Teams access (read)
    teams_query = """query { teams { nodes { id name } } }"""
    teams_result = execute_query(teams_query)
    results['teams_access'] = bool(teams_result and 'data' in teams_result and 'teams' in teams_result['data'])
    
    # Test 3: Direct HTTP access
    try:
        headers = {
            'Authorization': LINEAR_API_KEY,
            'Content-Type': 'application/json'
        }
        direct_query = {'query': 'query { viewer { id name email } }'}
        direct_response = requests.post(LINEAR_API_URL, json=direct_query, headers=headers)
        direct_result = direct_response.json()
        results['direct_access'] = bool(direct_response.status_code == 200 and 'data' in direct_result and 'viewer' in direct_result['data'])
        results['headers'] = {k: v for k, v in headers.items() if k != 'Authorization'}
        results['status_code'] = direct_response.status_code
    except Exception as e:
        results['direct_access'] = False
        results['direct_error'] = str(e)
    
    # Test 4: Check if the API key is read-only
    admin_query = """query { viewer { admin } }"""
    admin_result = execute_query(admin_query)
    if admin_result and 'data' in admin_result and 'viewer' in admin_result['data']:
        results['is_admin'] = bool(admin_result['data']['viewer'].get('admin'))
    else:
        results['is_admin'] = False
    
    # Test 5: Try a simple issue update (write test)
    if results.get('teams_access') and teams_result and 'data' in teams_result and 'teams' in teams_result['data']:
        teams = teams_result['data']['teams']['nodes']
        if teams:
            team_id = teams[0]['id']
            # Try to create an issue (write operation)
            mutation = """
            mutation TestWrite($input: IssueCreateInput!) {
                issueCreate(input: $input) {
                    success
                }
            }
            """
            variables = {
                "input": {
                    "teamId": team_id,
                    "title": "API Test Issue - Please Delete",
                    "description": "This is a test issue created to verify API write permissions."
                }
            }
            write_result = execute_query(mutation, variables)
            results['write_access'] = bool(write_result and 'data' in write_result and 'issueCreate' in write_result['data'] and write_result['data']['issueCreate'].get('success'))
            if not results['write_access'] and 'errors' in write_result:
                results['write_errors'] = write_result['errors']
    
    return jsonify(results)

@csrf.exempt
@app.route('/api/test_comment')
def test_comment_creation():
    """Diagnostic route to specifically test comment creation capabilities"""
    results = {}
    
    # Test 1: Check basic API access
    viewer_query = """query { viewer { id name email } }"""
    viewer_result = execute_query(viewer_query)
    results['viewer_access'] = bool(viewer_result and 'data' in viewer_result and 'viewer' in viewer_result['data'])
    results['viewer_data'] = viewer_result['data']['viewer'] if results['viewer_access'] else None
    
    # Test 2: Check if we can fetch an issue
    issues_query = """query { issues(first: 1) { nodes { id identifier title } } }"""
    issues_result = execute_query(issues_query)
    results['issues_access'] = bool(issues_result and 'data' in issues_result and 'issues' in issues_result['data'])
    
    # Try to get a valid issue ID for testing
    issue_id = None
    if results['issues_access']:
        issues = issues_result['data']['issues']['nodes']
        if issues:
            issue_id = issues[0]['id']
            results['test_issue'] = {
                'id': issue_id,
                'identifier': issues[0]['identifier']
            }
    
    # Test 3: Check if we can access team data (comments might require team access)
    teams_query = """query { teams { nodes { id name } } }"""
    teams_result = execute_query(teams_query)
    results['teams_access'] = bool(teams_result and 'data' in teams_result and 'teams' in teams_result['data'])
    
    # Test 4: Check write permissions by trying to create an issue
    if results['teams_access']:
        teams = teams_result['data']['teams']['nodes']
        if teams:
            team_id = teams[0]['id']
            create_issue_mutation = """
            mutation CreateIssue($input: IssueCreateInput!) {
                issueCreate(input: $input) {
                    success
                    issue {
                        id
                    }
                }
            }
            """
            create_issue_vars = {
                "input": {
                    "teamId": team_id,
                    "title": "Test Issue - Please Delete"
                }
            }
            create_issue_result = execute_query(create_issue_mutation, create_issue_vars)
            results['issue_creation'] = bool(create_issue_result and 'data' in create_issue_result and 
                                        'issueCreate' in create_issue_result['data'] and 
                                        create_issue_result['data']['issueCreate'].get('success'))
            
            if results['issue_creation']:
                # Use the newly created issue for comment testing
                new_issue_id = create_issue_result['data']['issueCreate']['issue']['id']
                issue_id = new_issue_id
                results['new_test_issue'] = {
                    'id': new_issue_id
                }
    
    # Test 5: Attempt comment creation with different mutation formats
    if issue_id:
        # Try different formats of the comment mutation
        
        # Format 1: Standard format with input object
        mutation1 = """
        mutation CreateComment($input: CommentCreateInput!) {
            commentCreate(input: $input) {
                success
                comment {
                    id
                }
            }
        }
        """
        
        variables1 = {
            "input": {
                "issueId": issue_id,
                "body": "Test comment 1 - Standard format"
            }
        }
        
        result1 = execute_query(mutation1, variables1)
        results['comment_test_1'] = result1
        
        # Format 2: Direct parameters
        mutation2 = """
        mutation CreateComment($issueId: String!, $body: String!) {
            commentCreate(input: {
                issueId: $issueId,
                body: $body
            }) {
                success
            }
        }
        """
        
        variables2 = {
            "issueId": issue_id,
            "body": "Test comment 2 - Direct parameters"
        }
        
        result2 = execute_query(mutation2, variables2)
        results['comment_test_2'] = result2
        
        # Format 3: Hardcoded values in the mutation
        mutation3 = """
        mutation {
            commentCreate(input: {
                issueId: "%s",
                body: "Test comment 3 - Hardcoded values"
            }) {
                success
            }
        }
        """ % issue_id
        
        result3 = execute_query(mutation3)
        results['comment_test_3'] = result3
        
        # Format 4: Test with a minimal payload
        mutation4 = """
        mutation CreateComment($input: CommentCreateInput!) {
            commentCreate(input: $input) {
                success
            }
        }
        """
        
        variables4 = {
            "input": {
                "issueId": issue_id,
                "body": "Test"
            }
        }
        
        result4 = execute_query(mutation4, variables4)
        results['comment_test_4'] = result4
    
    # Test 6: Test permissions by checking if the user has specific permissions
    permissions_query = """query { viewer { admin } }"""
    permissions_result = execute_query(permissions_query)
    if permissions_result and 'data' in permissions_result and 'viewer' in permissions_result['data']:
        results['is_admin'] = bool(permissions_result['data']['viewer'].get('admin'))
    else:
        results['is_admin'] = False
    
    # Test 7: Try to get information about permissions
    scopes_query = """
    query {
        viewer {
            id
            name
            email
            admin
        }
    }
    """
    scopes_result = execute_query(scopes_query)
    results['user_details'] = scopes_result['data']['viewer'] if scopes_result and 'data' in scopes_result and 'viewer' in scopes_result['data'] else None
    
    return jsonify(results)

@csrf.exempt
@app.route('/api/check_permissions')
def check_api_permissions():
    """Diagnostic route to check API permissions specifically"""
    results = {}
    
    # Test basic read operations
    read_operations = {
        'viewer': """query { viewer { id name email } }""",
        'teams': """query { teams { nodes { id name } } }""",
        'issues': """query { issues(first: 1) { nodes { id identifier title } } }""",
        'projects': """query { projects(first: 1) { nodes { id name } } }"""
    }
    
    for name, query in read_operations.items():
        result = execute_query(query)
        results[f'can_read_{name}'] = bool(result and 'data' in result and result['data'].get(name))
    
    # Get a team for write tests
    team_id = None
    teams_result = execute_query(read_operations['teams'])
    if teams_result and 'data' in teams_result and 'teams' in teams_result['data']:
        teams = teams_result['data']['teams']['nodes']
        if teams:
            team_id = teams[0]['id']
            results['test_team'] = {'id': team_id, 'name': teams[0]['name']}
    
    # Test write operations
    if team_id:
        write_operations = {
            'create_issue': {
                'mutation': """
                mutation CreateIssue($input: IssueCreateInput!) {
                    issueCreate(input: $input) {
                        success
                        issue { id }
                    }
                }
                """,
                'variables': {
                    'input': {
                        'teamId': team_id,
                        'title': 'Permission Test Issue - Please Delete'
                    }
                }
            },
            'create_project': {
                'mutation': """
                mutation CreateProject($input: ProjectCreateInput!) {
                    projectCreate(input: $input) {
                        success
                        project { id }
                    }
                }
                """,
                'variables': {
                    'input': {
                        'teamIds': [team_id],
                        'name': 'Permission Test Project - Please Delete'
                    }
                }
            }
        }
        
        for name, operation in write_operations.items():
            result = execute_query(operation['mutation'], operation['variables'])
            success = bool(result and 'data' in result and 
                       name.replace('create_', '') + 'Create' in result['data'] and 
                       result['data'][name.replace('create_', '') + 'Create'].get('success'))
            
            results[f'can_{name}'] = success
            
            # If we successfully created an issue, try to comment on it
            if name == 'create_issue' and success:
                issue_id = result['data']['issueCreate']['issue']['id']
                results['test_issue'] = {'id': issue_id}
                
                comment_mutation = """
                mutation CommentCreate($input: CommentCreateInput!) {
                    commentCreate(input: $input) {
                        success
                        comment {
                            id
                        }
                    }
                }
                """
                
                comment_variables = {
                    'input': {
                        'issueId': issue_id,
                        'body': 'Permission test comment - please ignore'
                    }
                }
                
                # Try the comment creation
                comment_result = execute_query(comment_mutation, comment_variables)
                
                # Store all comment result data for inspection
                results['comment_test_full_result'] = comment_result
                
                # Determine if comment creation was successful
                results['can_create_comment'] = bool(comment_result and 'data' in comment_result and 
                                               'commentCreate' in comment_result['data'] and 
                                               comment_result['data']['commentCreate'].get('success'))
                
                # Check for specific errors
                if not results['can_create_comment'] and comment_result and 'errors' in comment_result:
                    results['comment_error'] = [
                        {
                            'message': error.get('message', 'Unknown error'),
                            'type': error.get('extensions', {}).get('type', 'Unknown'),
                            'is_permission_error': 'PERMISSION' in error.get('message', '').upper() or 
                                                 'NOT_AUTHORIZED' in error.get('extensions', {}).get('type', '')
                        }
                        for error in comment_result['errors']
                    ]
    
    # Test permissions explicitly
    auth_query = """
    query {
        viewer {
            admin
            organizationMember {
                role
            }
        }
    }
    """
    
    auth_result = execute_query(auth_query)
    if auth_result and 'data' in auth_result and 'viewer' in auth_result['data']:
        viewer = auth_result['data']['viewer']
        results['user_permissions'] = {
            'is_admin': bool(viewer.get('admin')),
            'role': viewer.get('organizationMember', {}).get('role', 'Unknown')
        }
    
    # Get API key info if possible
    key_info_query = """
    query {
        apiKeys {
            nodes {
                id
                label
                scopes
                lastUsedAt
            }
        }
    }
    """
    
    key_info_result = execute_query(key_info_query)
    if key_info_result and 'data' in key_info_result and 'apiKeys' in key_info_result['data']:
        api_keys = key_info_result['data']['apiKeys']['nodes']
        # Only include minimal info to avoid security risks
        results['api_key_info'] = [
            {
                'label': key.get('label', 'Unnamed key'),
                'scopes': key.get('scopes', []),
                'last_used': key.get('lastUsedAt')
            }
            for key in api_keys
        ]
    else:
        # If we can't access API keys info, check if this is a permission issue
        if key_info_result and 'errors' in key_info_result:
            results['api_key_info_error'] = [error.get('message', 'Unknown error') for error in key_info_result['errors']]
    
    return jsonify(results)

@csrf.exempt
@app.route('/api/direct_test_comment/<issue_id>')
def direct_test_comment(issue_id):
    """Test route that queries Linear API directly with minimal abstractions"""
    try:
        # Simple data collection for debugging
        debug_info = {
            'api_key_length': len(LINEAR_API_KEY) if LINEAR_API_KEY else 0,
            'api_key_prefix': LINEAR_API_KEY[:5] + '...' if LINEAR_API_KEY and len(LINEAR_API_KEY) > 5 else 'None',
            'issue_id': issue_id
        }
        
        # Try a direct query using the simplest possible syntax
        headers = {
            'Authorization': LINEAR_API_KEY,
            'Content-Type': 'application/json'
        }
        
        # First, verify the issue exists (simpler query)
        verify_query = """
        query {
            issue(id: "%s") {
                id
                title
            }
        }
        """ % issue_id
        
        verify_payload = {
            'query': verify_query
        }
        
        # Execute verification query
        verify_response = requests.post(LINEAR_API_URL, json=verify_payload, headers=headers)
        debug_info['verify_status'] = verify_response.status_code
        
        # Try to parse the verification response
        if verify_response.status_code == 200:
            verify_data = verify_response.json()
            debug_info['verify_data'] = verify_data
            
            if verify_data and 'data' in verify_data and 'issue' in verify_data['data'] and verify_data['data']['issue']:
                # Issue exists, try to create a comment
                comment_text = "Test comment via direct API - " + datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                
                # Simple comment mutation with no variables
                comment_mutation = """
                mutation {
                    commentCreate(input: { 
                        issueId: "%s", 
                        body: "%s" 
                    }) { 
                        success 
                        comment {
                            id
                        }
                    }
                }
                """ % (issue_id, comment_text)
                
                comment_payload = {
                    'query': comment_mutation
                }
                
                # Execute comment creation
                comment_response = requests.post(LINEAR_API_URL, json=comment_payload, headers=headers)
                debug_info['comment_status'] = comment_response.status_code
                
                # Parse comment creation response
                if comment_response.status_code == 200:
                    comment_data = comment_response.json()
                    debug_info['comment_data'] = comment_data
                    
                    if comment_data and 'data' in comment_data and 'commentCreate' in comment_data['data']:
                        comment_result = comment_data['data']['commentCreate']
                        debug_info['comment_success'] = comment_result.get('success', False)
                    elif 'errors' in comment_data:
                        debug_info['comment_errors'] = comment_data['errors']
                else:
                    debug_info['comment_response_text'] = comment_response.text
            else:
                debug_info['issue_exists'] = False
        else:
            debug_info['verify_response_text'] = verify_response.text
        
        return jsonify(debug_info)
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        })

@csrf.exempt
@app.route('/api/test_auth_formats/<issue_id>')
def test_auth_formats(issue_id):
    """Test both authentication formats with Linear API"""
    results = {}
    
    comment_text = "Test comment via API auth test - " + datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Test both authentication formats
    auth_formats = {
        'standard': LINEAR_API_KEY,  # "lin_api_1234..."
        'bearer': f"Bearer {LINEAR_API_KEY}"  # "Bearer lin_api_1234..."
    }
    
    # Simple query to verify authentication
    viewer_query = """
    query {
        viewer {
            id
            name
            email
        }
    }
    """
    
    # Simple comment mutation
    comment_mutation = """
    mutation {
        commentCreate(input: { 
            issueId: "%s", 
            body: "%s" 
        }) { 
            success 
            comment {
                id
            }
        }
    }
    """ % (issue_id, comment_text)
    
    # Test each auth format
    for auth_type, auth_header in auth_formats.items():
        auth_results = {}
        
        # Test viewer query
        headers = {
            'Authorization': auth_header,
            'Content-Type': 'application/json'
        }
        
        # Test viewer query first
        viewer_payload = {'query': viewer_query}
        viewer_response = requests.post(LINEAR_API_URL, json=viewer_payload, headers=headers)
        
        auth_results['viewer_status'] = viewer_response.status_code
        
        if viewer_response.status_code == 200:
            viewer_data = viewer_response.json()
            auth_results['viewer_data'] = viewer_data
            
            # If viewer query worked, try comment creation
            if viewer_data and 'data' in viewer_data and 'viewer' in viewer_data['data']:
                # Authenticated successfully, try comment creation
                comment_payload = {'query': comment_mutation}
                comment_response = requests.post(LINEAR_API_URL, json=comment_payload, headers=headers)
                
                auth_results['comment_status'] = comment_response.status_code
                
                if comment_response.status_code == 200:
                    comment_data = comment_response.json()
                    auth_results['comment_data'] = comment_data
                    
                    if 'errors' in comment_data:
                        auth_results['comment_errors'] = comment_data['errors']
                    elif 'data' in comment_data and 'commentCreate' in comment_data['data']:
                        auth_results['comment_success'] = comment_data['data']['commentCreate'].get('success', False)
                else:
                    auth_results['comment_text'] = comment_response.text
        else:
            auth_results['viewer_text'] = viewer_response.text
        
        results[auth_type] = auth_results
    
    return jsonify(results)

@csrf.exempt
@app.route('/api/set_test_key/<api_key>/<issue_id>')
def set_test_key(api_key, issue_id):
    """Temporary route to set an API key for testing and try a comment creation.
    WARNING: Only use this in development, never in production as it puts the API key in URL.
    """
    # This is a global but only for this test code
    global LINEAR_API_KEY
    old_key = LINEAR_API_KEY
    
    # Store original key to restore later
    results = {
        'old_key_length': len(old_key) if old_key else 0,
        'new_key_length': len(api_key) if api_key else 0,
        'issue_id': issue_id
    }
    
    try:
        # Temporarily set the new key
        LINEAR_API_KEY = api_key
        
        # Try a standard access test
        viewer_query = """query { viewer { id name email } }"""
        headers = {
            'Authorization': LINEAR_API_KEY,  
            'Content-Type': 'application/json'
        }
        viewer_payload = {'query': viewer_query}
        
        viewer_response = requests.post(LINEAR_API_URL, json=viewer_payload, headers=headers)
        results['viewer_status'] = viewer_response.status_code
        
        if viewer_response.status_code == 200:
            viewer_data = viewer_response.json()
            if 'data' in viewer_data and 'viewer' in viewer_data['data']:
                results['viewer_access'] = True
                results['viewer_name'] = viewer_data['data']['viewer'].get('name')
                
                # Try a comment creation
                comment_text = "Test with new API key - " + datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                comment_mutation = """
                mutation {
                    commentCreate(input: { 
                        issueId: "%s", 
                        body: "%s" 
                    }) { 
                        success 
                        comment {
                            id
                        }
                    }
                }
                """ % (issue_id, comment_text)
                
                comment_payload = {'query': comment_mutation}
                comment_response = requests.post(LINEAR_API_URL, json=comment_payload, headers=headers)
                
                results['comment_status'] = comment_response.status_code
                
                if comment_response.status_code == 200:
                    comment_data = comment_response.json()
                    
                    if 'errors' in comment_data:
                        results['comment_errors'] = comment_data['errors']
                    elif 'data' in comment_data and 'commentCreate' in comment_data['data']:
                        results['comment_success'] = comment_data['data']['commentCreate'].get('success', False)
                        if 'comment' in comment_data['data']['commentCreate']:
                            results['comment_id'] = comment_data['data']['commentCreate']['comment'].get('id')
            else:
                results['viewer_access'] = False
        else:
            results['viewer_error'] = viewer_response.text
    finally:
        # Restore the original key
        LINEAR_API_KEY = old_key
    
    return jsonify(results)

@csrf.exempt
@app.route('/api/direct_test_update/<issue_id>')
def direct_test_update(issue_id):
    """Test route to directly test issue updates"""
    try:
        # Simple data collection for debugging
        debug_info = {
            'api_key_length': len(LINEAR_API_KEY) if LINEAR_API_KEY else 0,
            'api_key_prefix': LINEAR_API_KEY[:5] + '...' if LINEAR_API_KEY and len(LINEAR_API_KEY) > 5 else 'None',
            'issue_id': issue_id
        }
        
        # Try a direct query using the simplest possible syntax
        headers = {
            'Authorization': LINEAR_API_KEY,
            'Content-Type': 'application/json'
        }
        
        # First, verify the issue exists
        verify_query = """
        query {
            issue(id: "%s") {
                id
                title
                description
                state {
                    id
                    name
                }
                assignee {
                    id
                    name
                }
            }
        }
        """ % issue_id
        
        verify_payload = {
            'query': verify_query
        }
        
        # Execute verification query
        verify_response = requests.post(LINEAR_API_URL, json=verify_payload, headers=headers)
        debug_info['verify_status'] = verify_response.status_code
        
        # Try to parse the verification response
        if verify_response.status_code == 200:
            verify_data = verify_response.json()
            debug_info['verify_data'] = verify_data
            
            if verify_data and 'data' in verify_data and 'issue' in verify_data['data'] and verify_data['data']['issue']:
                # Issue exists, try updating with minimal data
                update_title = f"Updated test title - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                
                # Simple update mutation
                update_mutation = """
                mutation {
                    issueUpdate(
                        id: "%s", 
                        input: { 
                            title: "%s"
                        }
                    ) { 
                        success 
                        issue {
                            id
                            title
                        }
                    }
                }
                """ % (issue_id, update_title)
                
                update_payload = {
                    'query': update_mutation
                }
                
                # Execute update
                update_response = requests.post(LINEAR_API_URL, json=update_payload, headers=headers)
                debug_info['update_status'] = update_response.status_code
                
                # Parse update response
                if update_response.status_code == 200:
                    update_data = update_response.json()
                    debug_info['update_data'] = update_data
                    
                    if update_data and 'data' in update_data and 'issueUpdate' in update_data['data']:
                        update_result = update_data['data']['issueUpdate']
                        debug_info['update_success'] = update_result.get('success', False)
                        if 'issue' in update_result:
                            debug_info['updated_title'] = update_result['issue'].get('title')
                    elif 'errors' in update_data:
                        debug_info['update_errors'] = update_data['errors']
                else:
                    debug_info['update_response_text'] = update_response.text
            else:
                debug_info['issue_exists'] = False
        else:
            debug_info['verify_response_text'] = verify_response.text
        
        return jsonify(debug_info)
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        })

@csrf.exempt
@app.route('/api/echo', methods=['POST'])
def api_echo():
    """Simple debugging endpoint that echoes back the JSON request data"""
    try:
        # Get request data
        data = request.json
        headers = {k: v for k, v in request.headers.items()}
        
        # Return everything as JSON
        return jsonify({
            'success': True,
            'received_data': data,
            'headers': headers,
            'request_method': request.method,
            'content_type': request.content_type,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'request_data': request.get_data(as_text=True)
        }), 500

# OAuth Routes
@app.route('/login')
def login():
    """Initiate Linear OAuth flow"""
    try:
        app.logger.info("Login route accessed")
        
        if not LINEAR_CLIENT_ID or not LINEAR_CLIENT_SECRET:
            app.logger.error("Linear OAuth credentials not configured")
            flash("Linear OAuth is not configured. Please set LINEAR_CLIENT_ID and LINEAR_CLIENT_SECRET in your .env file.", "danger")
            return redirect(url_for('index'))
            
        # Create a random state value to prevent CSRF
        state = secrets.token_hex(16)
        session['oauth_state'] = state
        
        # Log session info for debugging
        app.logger.info(f"Session cookie set: {request.cookies.get('session') is not None}")
        app.logger.info(f"Generated state: {state}")
        
        # If we're using ngrok, make sure to use the current tunnel URL for the redirect
        redirect_uri = LINEAR_REDIRECT_URI
        
        app.logger.info(f"Initiating OAuth flow with redirect URI: {redirect_uri}")
        
        # Build the authorization URL
        auth_url = (
            f"https://linear.app/oauth/authorize"
            f"?client_id={LINEAR_CLIENT_ID}"
            f"&redirect_uri={redirect_uri}"
            f"&scope=issues:write,comments:write,read"
            f"&state={state}"
            f"&response_type=code"
        )
        
        app.logger.info(f"Redirecting to Linear auth URL: {auth_url}")
        
        # Create a dedicated page that shows the URL and a button to proceed
        # This helps troubleshoot by showing the exact URL being used
        return render_template(
            'oauth_redirect.html', 
            auth_url=auth_url,
            LINEAR_CLIENT_ID=LINEAR_CLIENT_ID,
            LINEAR_REDIRECT_URI=LINEAR_REDIRECT_URI
        )
        
        # Original direct redirect
        # return redirect(auth_url)
    except Exception as e:
        app.logger.error(f"Exception in login route: {str(e)}")
        app.logger.error(traceback.format_exc())
        flash(f"An error occurred when initiating login: {str(e)}", "danger")
        return redirect(url_for('index'))

@app.route('/auth/callback')
def auth_callback():
    """Handle Linear OAuth callback"""
    # Log all request details for debugging
    app.logger.info("OAuth callback received")
    app.logger.info(f"Full URL: {request.url}")
    app.logger.info(f"Query params: {request.args}")
    app.logger.info(f"Headers: {dict(request.headers)}")
    
    # Verify state to prevent CSRF
    state = request.args.get('state')
    error = request.args.get('error')
    error_description = request.args.get('error_description')
    
    app.logger.info(f"Auth callback received with args: {request.args}")
    
    if error:
        app.logger.error(f"OAuth error: {error} - {error_description}")
        flash(f"Authentication error: {error_description}", "danger")
        return redirect(url_for('index'))
        
    if not state or state != session.get('oauth_state'):
        app.logger.error(f"Invalid state parameter. Got: {state}, Expected: {session.get('oauth_state')}")
        flash("Invalid state parameter. Please try logging in again.", "danger")
        return redirect(url_for('index'))
    
    # Get the authorization code
    code = request.args.get('code')
    if not code:
        app.logger.error("No authorization code received")
        flash("No authorization code received. Please try again.", "danger")
        return redirect(url_for('index'))
    
    # Exchange the authorization code for an access token
    try:
        token_url = "https://api.linear.app/oauth/token"
        token_payload = {
            "client_id": LINEAR_CLIENT_ID,
            "client_secret": LINEAR_CLIENT_SECRET,
            "redirect_uri": LINEAR_REDIRECT_URI,
            "code": code,
            "grant_type": "authorization_code"
        }
        
        app.logger.info(f"Exchanging auth code for token with payload: {json.dumps(token_payload)}")
        
        token_response = requests.post(token_url, json=token_payload)
        app.logger.info(f"Token response status: {token_response.status_code}")
        app.logger.info(f"Token response headers: {dict(token_response.headers)}")
        app.logger.info(f"Token response body: {token_response.text}")
        
        # Try to parse the JSON response, but handle non-JSON responses
        try:
            token_data = token_response.json()
        except json.JSONDecodeError:
            app.logger.error(f"Failed to parse token response as JSON: {token_response.text}")
            flash("Error parsing response from Linear. Please check server logs.", "danger")
            return redirect(url_for('index'))
        
        if 'error' in token_data or token_response.status_code != 200:
            app.logger.error(f"Error getting access token: {token_data}")
            flash(f"Error getting access token: {token_data.get('error_description', 'Unknown error')}", "danger")
            return redirect(url_for('index'))
        
        # Store the access token in session
        session.permanent = True
        session['access_token'] = token_data['access_token']
        
        # Get user information
        user_info = get_user_info(token_data['access_token'])
        session['user'] = user_info
        
        flash("Successfully logged in!", "success")
        return redirect(url_for('index'))
    
    except Exception as e:
        app.logger.error(f"Exception during token exchange: {str(e)}")
        app.logger.error(traceback.format_exc())
        flash(f"An error occurred during authentication: {str(e)}", "danger")
        return redirect(url_for('index'))

def get_user_info(access_token):
    """Get user info from Linear using the access token"""
    query = """
    query {
        viewer {
            id
            name
            email
            displayName
            avatarUrl
        }
    }
    """
    
    try:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }
        response = requests.post(
            LINEAR_API_URL,
            json={"query": query},
            headers=headers
        )
        data = response.json()
        
        if 'data' in data and 'viewer' in data['data']:
            return data['data']['viewer']
        else:
            app.logger.error(f"Error fetching user info: {data}")
            return {
                'name': 'Unknown User',
                'displayName': 'Unknown User',
                'email': 'unknown@example.com',
                'id': 'unknown'
            }
    except Exception as e:
        app.logger.error(f"Exception getting user info: {str(e)}")
        return {
            'name': 'Unknown User',
            'displayName': 'Unknown User',
            'email': 'unknown@example.com',
            'id': 'unknown'
        }

@app.route('/logout')
def logout():
    """Log user out by clearing session"""
    session.clear()
    flash("You have been successfully logged out.", "success")
    return redirect(url_for('index'))

def get_linear_user_info(access_token):
    """Get Linear user info using the access token"""
    query = """
    query {
        viewer {
            id
            name
            email
            displayName
        }
    }
    """
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(
        LINEAR_API_URL,
        json={"query": query},
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        if "data" in data and "viewer" in data["data"]:
            return data["data"]["viewer"]
    
    app.logger.error(f"Failed to get user info: {response.text}")
    return None

def refresh_access_token(refresh_token):
    """Refresh the access token using the refresh token"""
    token_url = "https://api.linear.app/oauth/token"
    payload = {
        "client_id": LINEAR_CLIENT_ID,
        "client_secret": LINEAR_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }
    
    response = requests.post(token_url, json=payload)
    
    if response.status_code == 200:
        return response.json()
    app.logger.error(f"Failed to refresh token: {response.text}")
    return None

@app.route('/debug/oauth-config')
def debug_oauth_config():
    """Display OAuth configuration for debugging purposes"""
    return jsonify({
        'redirect_uri': LINEAR_REDIRECT_URI,
        'client_id_configured': bool(LINEAR_CLIENT_ID),
        'client_secret_configured': bool(LINEAR_CLIENT_SECRET),
        'ngrok_enabled': NGROK_ENABLED,
        'ngrok_available': ngrok_available,
        'ngrok_url': ngrok_tunnel_url
    })

@app.route('/oauth-setup-help')
def oauth_setup_help():
    """Provides help for setting up OAuth"""
    tunnel_options = [
        {
            'name': 'Ngrok',
            'url': 'https://ngrok.com',
            'command': 'ngrok http 5000',
            'notes': 'Free tier limited to one tunnel at a time. Requires creating an account and getting an auth token.'
        },
        {
            'name': 'LocalTunnel',
            'url': 'https://github.com/localtunnel/localtunnel',
            'command': 'npx localtunnel --port 5000',
            'notes': 'No account required, URL changes each session'
        },
        {
            'name': 'Cloudflare Tunnel',
            'url': 'https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/',
            'command': 'cloudflared tunnel --url http://localhost:5000',
            'notes': 'Requires Cloudflare account, but very reliable'
        }
    ]
    
    config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '.env'))
    
    return render_template(
        'oauth_setup.html', 
        tunnel_options=tunnel_options,
        config_path=config_path,
        current_redirect_uri=LINEAR_REDIRECT_URI
    )

if __name__ == '__main__':
    # Check if API key is set
    if not LINEAR_API_KEY:
        print("WARNING: LINEAR_API_KEY environment variable is not set!")
    
    app.run(debug=True) 