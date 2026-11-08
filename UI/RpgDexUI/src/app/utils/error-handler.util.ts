import { TranslateService } from '@ngx-translate/core';

export class ErrorHandlerUtil {

    public static parseApiError(err: any, translateService: TranslateService, callback: (errorMessage: string) => void): void {
    const body = err?.error;

    if (body?.errors && typeof body.errors === 'object') {
      const errorKeys = Object.keys(body.errors);
      if (errorKeys.length > 0) {
        const firstErrorVal = body.errors[errorKeys[0]];

        if (Array.isArray(firstErrorVal) && firstErrorVal.length > 0) {
          const primaryError = firstErrorVal[0];

          if (typeof primaryError === 'object' && primaryError?.code) {
            const translationKey = `ERRORS.${primaryError.code}`;
            translateService.get(translationKey).subscribe((translatedText: string) => {
              const hasTranslation = translatedText !== translationKey;
              callback(hasTranslation ? translatedText : primaryError.message);
            });
            return;
          }

          if (typeof primaryError === 'string') {
            if (primaryError.includes('request field is required')) {
              callback('Este campo é obrigatório.');
              return;
            }
            callback(primaryError);
            return;
          }
        }
      }
    }

    const errorList = Array.isArray(body?.message)
      ? body.message
      : Array.isArray(body?.errors)
      ? body.errors
      : [];

    const primaryError = errorList[0];

    if (primaryError?.code) {
      const translationKey = `ERRORS.${primaryError.code}`;
      translateService.get(translationKey).subscribe((translatedText: string) => {
        const hasTranslation = translatedText !== translationKey;
        callback(hasTranslation ? translatedText : primaryError.message);
      });
      return;
    }

    const fallbackText =
      (typeof body?.message === 'string' ? body.message : null) ??
      (typeof body?.detail === 'string' ? body.detail : null) ??
      (typeof body === 'string' ? body : null);

    if (fallbackText) {
      callback(fallbackText);
    } else {
      translateService.get('ERRORS.COMMON_DEFAULT').subscribe((res: string) => {
        const defaultMsg =
          res !== 'ERRORS.COMMON_DEFAULT'
            ? res
            : 'Ocorreu um erro ao processar o seu pedido. Tente novamente.';
        callback(defaultMsg);
      });
    }
  }
}