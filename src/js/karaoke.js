/**
 * Karaoke engine for synchronizing audio with text segments and words.
 * Uses sentence-level VTT data and linear interpolation for word-level highlights.
 */

class KaraokePlayer {
    constructor(audioElement, containerElement) {
        this.audio = audioElement;
        this.container = containerElement;
        this.cues = [];
        this.activeCueIndex = -1;
        this.activeWordElement = null;
        this.vttPath = this.audio.getAttribute('src').replace('.mp3', '.vtt');
        
        this.init();
    }

    async init() {
        try {
            const response = await fetch(this.vttPath);
            if (!response.ok) return;
            const vttText = await response.text();
            this.parseVTT(vttText);
            
            this.audio.addEventListener('timeupdate', () => this.update());
        } catch (e) {
            console.error("Karaoke init failed:", e);
        }
    }

    parseVTT(vttText) {
        const lines = vttText.split(/\r?\n/);
        let currentCue = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line === 'WEBVTT') continue;

            const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}[\.,]\d{3}) --> (\d{2}:\d{2}:\d{2}[\.,]\d{3})/);
            if (timeMatch) {
                currentCue = {
                    start: this.parseTime(timeMatch[1]),
                    end: this.parseTime(timeMatch[2]),
                    text: ''
                };
            } else if (currentCue && isNaN(line)) {
                currentCue.text += (currentCue.text ? ' ' : '') + line;
                if (i + 1 === lines.length || !lines[i+1].trim() || /^\d+$/.test(lines[i+1]) || lines[i+1].includes('-->')) {
                    this.cues.push(currentCue);
                    currentCue = null;
                }
            }
        }
        this.mapCuesToDOM();
    }

    parseTime(vttTime) {
        const parts = vttTime.replace(',', '.').split(':');
        return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    }

    mapCuesToDOM() {
        const segments = Array.from(this.container.querySelectorAll('.reading-segment'));
        
        this.cues.forEach((cue, index) => {
            const cleanCueText = cue.text.replace(/[.,!?;:]/g, '').toLowerCase().trim();
            const match = segments.find(seg => {
                const segText = seg.innerText.replace(/[.,!?;:]/g, '').toLowerCase();
                return segText.includes(cleanCueText) || cleanCueText.includes(segText);
            });

            if (match) {
                cue.element = match;
                // Prepare word-level timing data for this cue
                const words = Array.from(match.querySelectorAll('.k-word'));
                if (words.length > 0) {
                    const totalChars = words.reduce((acc, w) => acc + w.innerText.length, 0);
                    const duration = cue.end - cue.start;
                    let currentOffset = cue.start;
                    
                    cue.wordTimings = words.map(w => {
                        const wordDuration = (w.innerText.length / totalChars) * duration;
                        const timing = {
                            element: w,
                            start: currentOffset,
                            end: currentOffset + wordDuration
                        };
                        currentOffset += wordDuration;
                        return timing;
                    });
                }
            }
        });
    }

    update() {
        const currentTime = this.audio.currentTime;
        let activeCue = null;

        // 1. Find the active sentence
        for (let i = 0; i < this.cues.length; i++) {
            if (currentTime >= this.cues[i].start && currentTime <= this.cues[i].end) {
                activeCue = this.cues[i];
                if (this.activeCueIndex !== i) {
                    if (this.activeCueIndex !== -1 && this.cues[this.activeCueIndex].element) {
                        this.cues[this.activeCueIndex].element.classList.remove('karaoke-active');
                    }
                    if (activeCue.element) activeCue.element.classList.add('karaoke-active');
                    this.activeCueIndex = i;
                }
                break;
            }
        }

        // 2. Find the active word within that sentence
        if (activeCue && activeCue.wordTimings) {
            let activeWord = null;
            for (const wt of activeCue.wordTimings) {
                if (currentTime >= wt.start && currentTime <= wt.end) {
                    activeWord = wt.element;
                    break;
                }
            }

            if (activeWord !== this.activeWordElement) {
                if (this.activeWordElement) {
                    this.activeWordElement.classList.remove('word-active');
                    this.activeWordElement.classList.add('word-visited');
                }
                if (activeWord) {
                    activeWord.classList.add('word-active');
                    activeWord.classList.remove('word-visited');
                }
                this.activeWordElement = activeWord;
            }
        } else if (!activeCue) {
            // Cleanup: remove visited classes when switching out
            if (this.activeCueIndex !== -1 && this.cues[this.activeCueIndex].element) {
                this.cues[this.activeCueIndex].element.classList.remove('karaoke-active');
                this.cues[this.activeCueIndex].element.querySelectorAll('.k-word').forEach(w => {
                    w.classList.remove('word-visited', 'word-active');
                });
            }
            if (this.activeWordElement) this.activeWordElement.classList.remove('word-active');
            this.activeCueIndex = -1;
            this.activeWordElement = null;
        }
    }
}
