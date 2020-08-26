import { authenticationService } from '@/_services';

export function handleResponse(response) {
    // console.log("resp", response)
    return response.text().then(text => {
        console.log("text",text)
        console.log("is ok", response.ok)
        const data = text && JSON.parse(text);
        console.log('data', data)
        if (!response.ok) {
            // should be 401 and 403
            if ([402, 403].indexOf(response.status) !== -1) {
                // auto logout if 401 Unauthorized or 403 Forbidden response returned from api
                authenticationService.logout();
                location.reload(true);
            }
            
            const error = (data && data.message) || response.statusText;
            console.log('return promise error', error)
            return Promise.reject(error);
        }
        console.log('return data', data)
        return data;
    });
}