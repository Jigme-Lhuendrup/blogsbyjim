function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        fetch(`/admin/users/${userId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
        })
        .then(response => {
            if (!response.ok) {
                response.json().then(err => {
                    console.error('Server error:', err);
                    alert(`Failed to delete user: ${err.error || 'Server error'}`);
                }).catch(() => {
                    alert('Failed to delete user. Server returned an error.');
                });
                throw new Error('Failed to delete user');
            }
            return response.json(); // Expecting { success: true }
        })
        .then(data => {
            if (data.success) {
                window.location.reload();
            } else {
                alert(data.message || 'Failed to delete user.');
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            // Avoid double alerting if already handled by !response.ok
            if (error.message !== 'Failed to delete user') {
                 alert('An error occurred while trying to delete the user. Please try again.');
            }
        });
    }
}

function deletePost(postId) {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        fetch(`/admin/posts/${postId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
        })
        .then(response => {
            if (!response.ok) {
                response.json().then(err => {
                    console.error('Server error:', err);
                    alert(`Failed to delete post: ${err.error || 'Server error'}`);
                }).catch(() => {
                    alert('Failed to delete post. Server returned an error.');
                });
                throw new Error('Failed to delete post');
            }
            return response.json(); // Expecting { success: true }
        })
        .then(data => {
            if (data.success) {
                window.location.reload();
            } else {
                alert(data.message || 'Failed to delete post.');
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            // Avoid double alerting if already handled by !response.ok
            if (error.message !== 'Failed to delete post') {
                alert('An error occurred while trying to delete the post. Please try again.');
            }
        });
    }
}