from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
import requests

API_BASE = "http://127.0.0.1:8000/api"


def get_headers(request):
    """
    Returns Authorization headers if an access token exists, otherwise returns None.
    """
    token = request.session.get("access_token")
    return {"Authorization": f"Bearer {token}"} if token else None


def refresh_token(request):
    """
    Attempts to refresh the access token using the refresh token.
    Returns True on success, False on failure (and flushes session).
    """
    refresh = request.session.get("refresh_token")
    if not refresh:
        return False
        
    res = requests.post(f"{API_BASE}/token/refresh/", data={"refresh": refresh})
    
    if res.status_code == 200:
        new_access = res.json().get("access")
        request.session["access_token"] = new_access
        return True
        
    # If refresh fails, tokens are invalid, so log the user out.
    request.session.flush()
    return False


def call_api_with_auth(request, method, url, **kwargs):
    """
    Handles API calls, automatically attempting a token refresh and retry on 401.
    Returns (response, needs_login) tuple.
    """
    # 1. Initial check for authentication
    headers = get_headers(request)
    if not headers:
        return (None, True) # Needs login

    kwargs['headers'] = headers
    
    # 2. First attempt
    res = requests.request(method, url, **kwargs)
    
    # 3. Check for 401 and attempt refresh/retry
    if res.status_code == 401:
        if refresh_token(request):
            # Retry with new token
            headers = get_headers(request)
            kwargs['headers'] = headers
            res = requests.request(method, url, **kwargs)
        else:
            # Refresh failed, user must log in
            return (None, True)

    # 4. Final check: if 401 still exists (after retry) or other fatal error
    if res.status_code == 401 or (res.status_code not in (200, 201, 204) and method != 'GET'):
        # For GET requests, we let the calling view decide on redirect based on final status.
        # For mutating requests (POST, PATCH, DELETE), a failure after refresh is an error, not a login issue.
        if method == 'GET' and res.status_code != 200:
             return (res, True) # Treat failed GET as 'needs login'
        
    return (res, False) # Return response and 'does not need login'


# --- Views using the reliable wrapper ---

def index(request):
    # Call the helper
    res, needs_login = call_api_with_auth(request, 'GET', f"{API_BASE}/todos/")
    
    if needs_login:
        return redirect('login_page')

    # The request should be successful at this point
    if res.status_code != 200:
        # Catch unexpected non-401 errors (e.g., 500 server error)
        print("API Error:", res.status_code, res.text)
        return redirect('login_page') # Treat as a fatal error for simplicity

    return render(request, 'base.html', {'todo_list': res.json()})


def add(request):
    if request.method == "POST":
        title = request.POST.get('title')
        if title:
            # POST expects 201 Created or 200 OK
            res, needs_login = call_api_with_auth(request, 'POST', f"{API_BASE}/todos/", data={"title": title})

            if needs_login:
                return redirect('login_page')
                
            if res.status_code not in (200, 201):
                print("Error adding todo:", res.text)
                
    return redirect('index')


def update(request, todo_id):
    # PATCH expects 200 OK or 204 No Content
    res, needs_login = call_api_with_auth(request, 'PATCH', f"{API_BASE}/todos/{todo_id}/", data={"complete": True})

    if needs_login:
        return redirect('login_page')
        
    if res.status_code not in (200, 204):
        print("Error updating todo:", res.text)
        
    return redirect('index')


def delete(request, todo_id):
    # DELETE expects 200 OK or 204 No Content
    res, needs_login = call_api_with_auth(request, 'DELETE', f"{API_BASE}/todos/{todo_id}/")

    if needs_login:
        return redirect('login_page')
        
    if res.status_code not in (200, 204):
        print("Error deleting todo:", res.text)
        
    return redirect('index')


def login_page(request):
    # This view doesn't need the wrapper, as it's handling the tokens directly.
    if request.method == "POST":
        username, password = request.POST.get('username'), request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        
        if not user:
            return render(request, 'login.html', {'error': 'Invalid username or password'})

        login(request, user)
        
        # Get JWT tokens
        res = requests.post(f"{API_BASE}/token/", data={"username": username, "password": password})
        
        if res.status_code == 200:
            tokens = res.json()
            request.session["access_token"] = tokens.get("access")
            request.session["refresh_token"] = tokens.get("refresh")
        else:
            # Authentication succeeded but token fetch failed (unlikely, but possible)
            print("JWT token fetch failed:", res.text)
            
        return redirect('index')

    return render(request, 'login.html')