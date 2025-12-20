<!DOCTYPE html>
<html>
<body>
    <h1>New User Pending Verification</h1>
    <p>A new user has signed up and needs your approval.</p>
    <ul>
        <li><strong>Name:</strong> {{ $user->name }}</li>
        <li><strong>Email:</strong> {{ $user->email }}</li>
        <li><strong>School ID:</strong> {{ $user->school_id_no }}</li>
        <li><strong>Type:</strong> {{ $user->gender }}</li>
    </ul>
    <p>Please check the attached profile picture to verify their identity.</p>
</body>
</html>