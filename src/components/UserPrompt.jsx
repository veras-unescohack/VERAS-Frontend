import '../styles/prompt.css'

export function UserPrompt() {

    function sumbitPrompt() {
        console.log("Sumbit user prompt")
    }


    return (
        <div className="prompt-container">
            <h1>Analyze if its AI</h1>

            <div className='prompt-description'>
                <input placeholder="What would you like to inspect today?"></input>
                <button onClick={sumbitPrompt}>
                    <span className="material-symbols-outlined">arrow_upward</span>
                </button>
            </div>

            <div className="prompt-media">
                <span className="material-symbols-outlined">attach_file</span>
                <span className="material-symbols-outlined">add_photo_alternate</span>
                <span className="material-symbols-outlined">add_a_photo</span>
            </div>
        </div>
    );
}