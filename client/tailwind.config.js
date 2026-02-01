/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'serif': ['"DM Serif Display"', 'serif'],
                'handwriting': ['Quicksand', 'sans-serif'],
                'sans': ['Quicksand', 'sans-serif'],
            },
            aspectRatio: {
                '4/5': '4/5',
            },
            animation: {
                'bounce-slight': 'bounceSlight 0.5s infinite alternate',
                'float': 'float 3s ease-in-out infinite',
                'nod': 'nod 1s ease-in-out infinite',
                'blink': 'blink 3s infinite',
                'talk': 'talk 0.2s infinite alternate',
                'pop-in': 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'gradient-xy': 'gradient 15s ease infinite',
                'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                bounceSlight: {
                    'from': { transform: 'translateY(0)' },
                    'to': { transform: 'translateY(-2px)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                nod: {
                    '0%, 100%': { transform: 'rotate(0deg)' },
                    '50%': { transform: 'rotate(1deg)' },
                },
                blink: {
                    '0%, 96%, 100%': { transform: 'scaleY(1)' },
                    '98%': { transform: 'scaleY(0.1)' },
                },
                talk: {
                    'from': { transform: 'scaleY(1)' },
                    'to': { transform: 'scaleY(0.5)' },
                },
                popIn: {
                    'from': { transform: 'scale(0.8)', opacity: '0' },
                    'to': { transform: 'scale(1)', opacity: '1' },
                },
                fadeIn: {
                    'from': { opacity: '0' },
                    'to': { opacity: '1' },
                },
                slideUp: {
                    'from': { transform: 'translateY(20px)', opacity: '0' },
                    'to': { transform: 'translateY(0)', opacity: '1' },
                },
                gradient: {
                    '0%, 100%': {
                        'background-size': '200% 200%',
                        'background-position': 'left center'
                    },
                    '50%': {
                        'background-size': '200% 200%',
                        'background-position': 'right center'
                    },
                },
            },
        },
    },
    plugins: [],
}
