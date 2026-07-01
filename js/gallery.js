document.addEventListener('DOMContentLoaded', () => {
    const galleryContainer = document.getElementById('gallery-collage');
    const folderItems = document.querySelectorAll('.folder-item');
    // const dateHeader = document.getElementById('gallery-date'); // If dynamic dates needed later

    // Define image library
    // Using simple array duplications to fill the view
    const sourceImages = [
        'images/gallery/projects/project1.jpeg',
        'images/gallery/travel/travel1.jpeg',
        'images/gallery/projects/project2.jpeg',
        'images/gallery/favorites/fav1.jpeg',
        'images/gallery/travel/travel2.jpeg',
        'images/about.JPEG'
    ];

    // Helper to generate a larger randomized list
    function generatePseudoLibrary(count) {
        let arr = [];
        for (let i = 0; i < count; i++) {
            const src = sourceImages[i % sourceImages.length];
            // Random flex-grow aspect ratio simulation
            // In a real app this would depend on image dimensions
            const width = Math.floor(Math.random() * 200) + 120; // 120px to 320px
            arr.push({ src, width });
        }
        return arr;
    }

    const library = {
        'all': generatePseudoLibrary(24),
        'favorites': generatePseudoLibrary(8),
        'recents': generatePseudoLibrary(12),
        'memories': generatePseudoLibrary(10),
        'albums': generatePseudoLibrary(5),
        // Add specific examples for "projects", "travel", etc if needed
        'projects': [
            { src: 'images/gallery/projects/project1.jpeg', width: 200 },
            { src: 'images/gallery/projects/project2.jpeg', width: 150 },
            { src: 'images/gallery/projects/project1.jpeg', width: 200 },
            { src: 'images/gallery/projects/project2.jpeg', width: 150 }
        ],
        'travel': [
            { src: 'images/gallery/travel/travel1.jpeg', width: 180 },
            { src: 'images/gallery/travel/travel2.jpeg', width: 220 },
            { src: 'images/gallery/travel/travel1.jpeg', width: 180 }
        ],
        'nature': [
            // Placeholder since we moved the nature image to favorites
            { src: 'images/gallery/favorites/fav1.jpeg', width: 200 }
        ]
    };

    function renderCollage(folder) {
        galleryContainer.style.opacity = '0';

        setTimeout(() => {
            galleryContainer.innerHTML = '';

            const images = library[folder] || [];

            if (images.length === 0) {
                galleryContainer.innerHTML = '<p style="color: #666; width: 100%;">No photos in this album.</p>';
            } else {
                images.forEach(img => {
                    const item = document.createElement('div');
                    item.className = 'collage-item';

                    // Assign a random width relative to height (flex-grow)
                    // The CSS height is fixed at 180px. 
                    // We set flex-grow proportional to the "width" we want, 
                    // and also min-width to ensure it doesn't shrink too much.
                    item.style.flex = `${img.width / 180} 1 auto`;
                    item.style.minWidth = '100px';

                    // Using object-fit: cover in CSS handles the actual image content
                    item.innerHTML = `<img src="${img.src}" loading="lazy" alt="Gallery Image">`;
                    galleryContainer.appendChild(item);
                });
            }

            galleryContainer.style.opacity = '1';
        }, 150);
    }

    // Event Listeners for Sidebar
    folderItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update Active State
            folderItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Get Folder Name
            const folder = item.getAttribute('data-folder');

            // Render Content
            renderCollage(folder);
        });
    });

    // Initial Render
    renderCollage('all');
});
