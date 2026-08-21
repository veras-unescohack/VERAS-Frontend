import '../styles/prompt.css'

export function UserPrompt() {

    function sumbitPrompt() {
        console.log("Sumbit user prompt")
    }

    return (
        <div className="prompt-container">
            <h2>What would you like to inspect today?</h2>

            <div className='prompt-input'>
                <textarea placeholder="Write context of your media"></textarea>
                <button onClick={sumbitPrompt}>
                    <span className="material-symbols-outlined">arrow_upward</span>
                </button>
                <div className="prompt-media">
                    <span className="material-symbols-outlined">attach_file</span>
                    <span className="material-symbols-outlined">add_photo_alternate</span>
                    <span className="material-symbols-outlined">add_a_photo</span>
                </div>
            </div>

        </div>
    );
}