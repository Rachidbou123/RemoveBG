/**
 * @fileOverview Core Application Logic for Background Removal
 * Implements strict state management, memory cleanup, and touch-ready interactive UI.
 */
import { removeBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm';

class BgRemoverApp {
    constructor() {
        this.state = 'IDLE'; // States: IDLE, LOADING, SUCCESS, ERROR
        this.cache = {
            originalUrl: null,
            resultUrl: null
        };
        
        this.initializeDOM();
        this.bindEvents();
    }

    initializeDOM() {
        this.elements = {
            dropzone: document.getElementById('dropzone'),
            fileInput: document.getElementById('fileInput'),
            
            // State Views
            viewIdle: document.getElementById('viewIdle'),
            viewLoading: document.getElementById('viewLoading'),
            viewResult: document.getElementById('viewResult'),
            errorBanner: document.getElementById('errorBanner'),
            
            // Result Assets
            imgBefore: document.getElementById('imgBefore'),
            imgAfter: document.getElementById('imgAfter'),
            btnDownload: document.getElementById('btnDownload'),
            slider: document.getElementById('comparisonSlider'),
            sliderHandle: document.getElementById('sliderHandle')
        };
    }

    bindEvents() {
        const { dropzone, fileInput, slider } = this.elements;

        // File Selection Events
        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-active');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-active'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-active');
            if (e.dataTransfer.files.length) this.processFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) this.processFile(e.target.files[0]);
        });

        // Interactive Slider Events (Mouse & Touch)
        let isSliding = false;
        const startSlide = () => isSliding = true;
        const stopSlide = () => isSliding = false;
        const onSlide = (e) => {
            if (!isSliding) return;
            const rect = slider.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let position = ((clientX - rect.left) / rect.width) * 100;
            // Constrain between 0 and 100
            position = Math.max(0, Math.min(100, position));
            
            this.elements.imgBefore.style.clipPath = `polygon(0 0, ${position}% 0, ${position}% 100%, 0 100%)`;
            this.elements.sliderHandle.style.left = `${position}%`;
        };

        slider.addEventListener('mousedown', startSlide);
        slider.addEventListener('touchstart', startSlide, { passive: true });
        window.addEventListener('mouseup', stopSlide);
        window.addEventListener('touchend', stopSlide);
        window.addEventListener('mousemove', onSlide);
        window.addEventListener('touchmove', onSlide, { passive: true });
    }

    setUIState(newState, errorMessage = '') {
        this.state = newState;
        const { viewIdle, viewLoading, viewResult, errorBanner } = this.elements;
        
        // Hide all views first
        [viewIdle, viewLoading, viewResult].forEach(el => el.classList.remove('is-active'));
        errorBanner.style.display = 'none';

        switch (newState) {
            case 'IDLE':
                viewIdle.classList.add('is-active');
                break;
            case 'LOADING':
                viewLoading.classList.add('is-active');
                break;
            case 'SUCCESS':
                viewResult.classList.add('is-active');
                // Reset slider to 50%
                this.elements.imgBefore.style.clipPath = `polygon(0 0, 50% 0, 50% 100%, 0 100%)`;
                this.elements.sliderHandle.style.left = `50%`;
                break;
            case 'ERROR':
                viewIdle.classList.add('is-active');
                errorBanner.innerText = errorMessage;
                errorBanner.style.display = 'block';
                break;
        }
    }

    clearMemory() {
        // Prevent catastrophic browser memory leaks from persistent Object URLs
        if (this.cache.originalUrl) URL.revokeObjectURL(this.cache.originalUrl);
        if (this.cache.resultUrl) URL.revokeObjectURL(this.cache.resultUrl);
    }

    async processFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            this.setUIState('ERROR', 'Please upload a valid image file (JPG, PNG, WEBP).');
            return;
        }

        this.setUIState('LOADING');
        this.clearMemory();

        try {
            // Load original image into UI instantly
            this.cache.originalUrl = URL.createObjectURL(file);
            this.elements.imgBefore.src = this.cache.originalUrl;
            this.elements.imgAfter.src = ''; // Clear old result

            // Execute client-side ML processing
            const processedBlob = await removeBackground(file, {
                model: 'medium', // High-fidelity edge retention
                output: { format: 'image/png', quality: 1.0 }
            });

            // Handle successful output
            this.cache.resultUrl = URL.createObjectURL(processedBlob);
            this.elements.imgAfter.src = this.cache.resultUrl;
            
            // Set download link parameters
            this.elements.btnDownload.href = this.cache.resultUrl;
            const originalName = file.name.split('.')[0] || 'image';
            this.elements.btnDownload.download = `${originalName}-transparent.png`;

            this.setUIState('SUCCESS');
        } catch (error) {
            console.error('[BgRemoverApp] Inference Error:', error);
            this.setUIState('ERROR', 'The AI encountered a problem processing this image. Try an image with a clearer subject.');
        } finally {
            // Reset the file input so the same file can be selected again if needed
            this.elements.fileInput.value = '';
        }
    }
}

// Bootstrap application once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BgRemoverApp();
});
