export function assign_coder_chat_name(coders: string[]){
    let coders_named: any = {}
    for(let i = 0; i < coders?.length; i++){
        coders_named[coders[i]] = `C${i+1}`
    }

    return coders_named;
}