import { removeBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm';

const fileInput = document.getElementById('fileInput');
const loader = document.getElementById('loader');
const showcase = document.getElementById('showcase');
const viewOriginal = document.getElementById('viewOriginal');
const viewResult = document.getElementById('viewResult');
const downloadLink = document.getElementById('downloadLink');

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    viewOriginal.src = URL.createObjectURL(file);
    showcase.style.display = 'grid';
    loader.style.display = 'block';
    downloadLink.style.display = 'none';
    viewResult.src = ''; 

    try {
        const processedBlob = await removeBackground(file, {
            model: 'medium', 
            output: { format: 'image/png', quality: 1.0 }
        });

        const finalUrl = URL.createObjectURL(processedBlob);
        viewResult.src = finalUrl;
        
        downloadLink.href = finalUrl;
        downloadLink.style.display = 'inline-block';
        loader.style.display = 'none';
    } catch (err) {
        console.error(err);
        loader.innerText = "Error: Please try an image with a clearer subject.";
    }
});
