document.addEventListener('DOMContentLoaded', () => {
    const monitorText = document.getElementById('monitorText');

    setInterval(() => {
        const messages = [
            "Mining some diamonds...",
            "Crafting a pickaxe...",
            "Exploring the Nether...",
            "Beware of the creepers!",
            "Building a redstone contraption..."
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        monitorText.textContent = randomMessage;
    }, 3000);
});
