# Linear Roadmap Web App

A Flask web application for viewing and managing Linear issues in a Kanban-style roadmap, with support for OAuth user authentication.

## Features

- View teams, projects, and issues
- Kanban-style roadmap view
- Issue management (update, comment)
- OAuth user authentication for personalized comments
- API endpoints for integrations

## Deployment to Render

1. Fork or clone this repository
2. Sign up for a [Render](https://render.com) account
3. Create a new Web Service and connect your repository
4. Set the required environment variables:
   - `LINEAR_API_KEY`: Your Linear API key
   - `LINEAR_CLIENT_ID`: OAuth Client ID from Linear
   - `LINEAR_CLIENT_SECRET`: OAuth Client Secret from Linear
   - `LINEAR_REDIRECT_URI`: `https://your-render-app-name.onrender.com/auth/callback`
5. Deploy and enjoy your new Linear roadmap application!

## Local Development

```
# Clone the repository
git clone https://github.com/yourusername/linear-roadmap.git
cd linear-roadmap

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Set up environment variables in .env file
# See env_example.txt for required variables

# Run the application
python app.py
```

## Requirements

- Python 3.7+
- Linear API key

## Installation

1. Clone this repository:
```
git clone <repository-url>
cd linear-issue-roadmap
```

2. Install required dependencies:
```
pip install -r requirements.txt
```

3. Create a `.env` file in the root directory with your Linear API key:
```
LINEAR_API_KEY=your_linear_api_key_here
FLASK_SECRET_KEY=your_flask_secret_key_here
```

To get your Linear API key:
1. Log in to your Linear account
2. Go to Settings > API > Personal API Keys
3. Create a new API key with the necessary permissions

## Usage

1. Start the Flask application:
```
python app.py
```

2. Open your web browser and navigate to:
```
http://localhost:5000
```

3. Select a team, then a project (optional), and view the Kanban board of issues
4. Click on any issue card to view details, edit, or add comments

## Project Structure

- `app.py`: Main Flask application with routes and Linear API integration
- `templates/`: HTML templates for the web interface
  - `layout.html`: Base template with common elements
  - `index.html`: Team selection page
  - `projects.html`: Project selection page
  - `roadmap.html`: Kanban board view of issues
  - `issue_details.html`: Detailed issue view with editing and comments

## Linear API Integration

This application uses Linear's GraphQL API to:
- Fetch teams, projects, workflow states, and issues
- Update issue properties
- Add comments to issues

## Security Considerations

- Store your Linear API key securely and never commit it to version control
- Use environment variables or a secure secrets management solution
- This application is designed for internal use; additional security measures should be implemented for public deployment

## License

MIT 