<!DOCTYPE html>
<html>
<body>
    <h2>New User Registration</h2>
    <p>A new user has signed up and needs verification.</p>
    <ul>
        <li><strong>Name:</strong> {{ $user->name }}</li>
        <li><strong>Email:</strong> {{ $user->email }}</li>
        <li><strong>Role:</strong> {{ $user->is_admin ? 'Admin' : 'User' }}</li>
    </ul>
    <p>Please check the attached image to verify their identity.</p>
</body>
</html>