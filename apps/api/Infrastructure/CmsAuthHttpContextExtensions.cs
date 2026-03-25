using Microsoft.AspNetCore.Http;

public static class CmsAuthHttpContextExtensions
{
    private const string CmsAuthContextItemKey = "CmsAuthContext";

    public static CmsAuthContext? GetCmsAuthContext(this HttpContext httpContext)
    {
        if (httpContext.Items.TryGetValue(CmsAuthContextItemKey, out var authContextObject) == false)
        {
            return null;
        }

        return authContextObject as CmsAuthContext;
    }

    public static void SetCmsAuthContext(this HttpContext httpContext, CmsAuthContext authContext)
    {
        httpContext.Items[CmsAuthContextItemKey] = authContext;
    }
}
