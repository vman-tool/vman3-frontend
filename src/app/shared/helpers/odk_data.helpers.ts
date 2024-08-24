
export function filter_keys_without_data(odk_submissions: any){
    return odk_submissions?.map((odk_submission: any) => {
        let data_with_value: any = {};
        for(let key of Object.keys(odk_submission)){
            if(odk_submission[key]){
                data_with_value = {
                    ...data_with_value,
                    [key]: odk_submission[key]
                }
            }
        }
        return data_with_value;
    })
}