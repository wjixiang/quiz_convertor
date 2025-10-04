

function SplitPage(parsedText: string,chunkNum:int) -> ContentSlice[] {
    client GLM45Flash 
    prompt #"
        {{_.role("user")}}
        Split the following text of one test paper into {{chunkNum}} chunks, return the line index group in given format.

        **MUST PRESERVE QUESTION INTEGRITY: NEVER split the text within the middle of any individual question. Each complete question must be kept entirely in a single chunk.**

        ===paper text===

        {{parsedText}}

        ===end===

        {{ ctx.output_format }}
    "#
}