// Post Menu
function togglePostMenu(postId) {
    try {
        const postContainer = document.querySelector(`.post-container[data-post-id="${postId}"]`);
        if (!postContainer) {
            console.error('Post container not found for ID:', postId);
            return;
        }

        const menu = postContainer.querySelector('.post-menu');
        if (!menu) {
            console.error('Menu not found for post ID:', postId);
            return;
        }

        menu.classList.toggle('hidden');

        // Close other open menus
        document.querySelectorAll('.post-menu').forEach(otherMenu => {
            if (otherMenu !== menu && !otherMenu.classList.contains('hidden')) {
                otherMenu.classList.add('hidden');
            }
        });
    } catch (error) {
        console.error('Error in togglePostMenu:', error);
    }
}

function deletePost(postId) {
    try {
        if (!postId) {
            console.error('No post ID provided');
            return;
        }

        if (confirm('Are you sure you want to delete this post?')) {
            fetch(`/posts/${postId}`, { 
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin' // Include cookies
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Failed to delete post');
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('Delete successful:', data);
                const postContainer = document.querySelector(`.post-container[data-post-id="${postId}"]`);
                if (postContainer) {
                    postContainer.remove();
                } else {
                    console.error('Post container not found after successful delete');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert(error.message || 'Failed to delete post. Please try again.');
            });
        }
    } catch (error) {
        console.error('Error in deletePost:', error);
        alert('An unexpected error occurred. Please try again.');
    }
}

// Log when the script is loaded
console.log('Posts.js script loaded successfully'); 