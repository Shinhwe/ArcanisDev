using System.Globalization;
using System.Net;
using System.Text;
using HtmlAgilityPack;

public sealed class NewsHtmlDocumentBuilder : INewsHtmlDocumentBuilder
{
    private static readonly HashSet<string> AllowedTagNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "a",
        "b",
        "blockquote",
        "br",
        "code",
        "div",
        "em",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "i",
        "img",
        "li",
        "ol",
        "p",
        "pre",
        "span",
        "strong",
        "table",
        "tbody",
        "td",
        "th",
        "thead",
        "tr",
        "u",
        "ul",
    };

    private static readonly HashSet<string> StyleAttributeAllowedTagNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "div",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "li",
        "ol",
        "p",
        "span",
        "table",
        "tbody",
        "td",
        "th",
        "thead",
        "tr",
        "ul",
    };

    private static readonly HashSet<string> AllowedStylePropertyNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "background-color",
        "color",
        "font-style",
        "font-weight",
        "text-align",
        "text-decoration",
    };

    private static readonly HashSet<string> ForbiddenTagNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "button",
        "embed",
        "form",
        "iframe",
        "input",
        "object",
        "script",
        "select",
        "style",
        "textarea",
    };

    public string BuildArticleIframeHtmlDocument(string rawContent)
    {
        var sanitizedHtml = BuildSanitizedHtml(rawContent);
        var articleHtml = ContainsMeaningfulRichHtml(sanitizedHtml)
            ? sanitizedHtml
            : BuildPlainTextHtml(rawContent);

        return $$"""
            <!doctype html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width,initial-scale=1">
              <style>
                :root {
                  color-scheme: light;
                }

                * {
                  box-sizing: border-box;
                }

                html,
                body {
                  margin: 0;
                  padding: 0;
                  background-color: #0c1016;
                  color: #e9edf5;
                  font-family: Georgia, "Times New Roman", serif;
                  line-height: 1.7;
                }

                body {
                  padding: 0;
                }

                .article-root {
                  min-height: 100%;
                  padding: 0;
                }

                p,
                ul,
                ol,
                blockquote,
                pre,
                table {
                  margin: 0 0 1rem;
                }

                h1,
                h2,
                h3,
                h4,
                h5,
                h6 {
                  color: #f7fbff;
                  line-height: 1.25;
                  margin: 0 0 1rem;
                }

                a {
                  color: #a6d1ff;
                  text-decoration: underline;
                }

                img {
                  display: block;
                  height: auto;
                  max-width: 100%;
                }

                pre,
                code {
                  font-family: "SFMono-Regular", ui-monospace, monospace;
                }

                pre {
                  overflow-x: auto;
                  padding: 1rem;
                  border-radius: 0.75rem;
                  background-color: rgba(255, 255, 255, 0.08);
                }

                blockquote {
                  margin-left: 0;
                  padding-left: 1rem;
                  border-left: 3px solid rgba(166, 209, 255, 0.45);
                  color: rgba(233, 237, 245, 0.88);
                }

                table {
                  width: 100%;
                  border-collapse: collapse;
                }

                th,
                td {
                  padding: 0.75rem;
                  border: 1px solid rgba(255, 255, 255, 0.16);
                  text-align: left;
                  vertical-align: top;
                }
              </style>
            </head>
            <body>
              <div class="article-root">{{articleHtml}}</div>
            </body>
            </html>
            """;
    }

    private static string BuildSanitizedHtml(string rawContent)
    {
        var htmlDocument = new HtmlDocument();

        htmlDocument.LoadHtml($"<div>{rawContent}</div>");

        var stringBuilder = new StringBuilder();

        foreach (var childNode in htmlDocument.DocumentNode.ChildNodes)
        {
            AppendSanitizedNode(childNode, stringBuilder);
        }

        return stringBuilder.ToString();
    }

    private static void AppendSanitizedNode(HtmlNode htmlNode, StringBuilder stringBuilder)
    {
        if (htmlNode.NodeType == HtmlNodeType.Text)
        {
            var textContent = HtmlEntity.DeEntitize(htmlNode.InnerText) ?? string.Empty;

            if (textContent.Length == 0)
            {
                return;
            }

            stringBuilder.Append(WebUtility.HtmlEncode(textContent));
            return;
        }

        if (htmlNode.NodeType != HtmlNodeType.Element)
        {
            return;
        }

        if (ForbiddenTagNames.Contains(htmlNode.Name))
        {
            return;
        }

        if (AllowedTagNames.Contains(htmlNode.Name) == false)
        {
            foreach (var childNode in htmlNode.ChildNodes)
            {
                AppendSanitizedNode(childNode, stringBuilder);
            }

            return;
        }

        if (htmlNode.Name.Equals("br", StringComparison.OrdinalIgnoreCase))
        {
            stringBuilder.Append("<br />");
            return;
        }

        if (htmlNode.Name.Equals("img", StringComparison.OrdinalIgnoreCase))
        {
            AppendSanitizedImageNode(htmlNode, stringBuilder);
            return;
        }

        stringBuilder.Append('<');
        stringBuilder.Append(htmlNode.Name.ToLowerInvariant());
        AppendSanitizedAttributes(htmlNode, stringBuilder);
        stringBuilder.Append('>');

        foreach (var childNode in htmlNode.ChildNodes)
        {
            AppendSanitizedNode(childNode, stringBuilder);
        }

        stringBuilder.Append("</");
        stringBuilder.Append(htmlNode.Name.ToLowerInvariant());
        stringBuilder.Append('>');
    }

    private static void AppendSanitizedAttributes(HtmlNode htmlNode, StringBuilder stringBuilder)
    {
        if (htmlNode.Name.Equals("a", StringComparison.OrdinalIgnoreCase))
        {
            var hrefValue = htmlNode.GetAttributeValue("href", string.Empty);
            var normalizedHref = NormalizeUrl(hrefValue);

            if (normalizedHref is not null)
            {
                AppendAttribute(stringBuilder, "href", normalizedHref);
                AppendAttribute(stringBuilder, "target", "_blank");
                AppendAttribute(stringBuilder, "rel", "noopener noreferrer");
            }

            AppendOptionalAttribute(stringBuilder, "title", htmlNode.GetAttributeValue("title", string.Empty));
        }

        if (StyleAttributeAllowedTagNames.Contains(htmlNode.Name))
        {
            var sanitizedStyle = SanitizeStyleAttributeValue(htmlNode.GetAttributeValue("style", string.Empty));

            if (sanitizedStyle.Length > 0)
            {
                AppendAttribute(stringBuilder, "style", sanitizedStyle);
            }
        }
    }

    private static void AppendSanitizedImageNode(HtmlNode htmlNode, StringBuilder stringBuilder)
    {
        var normalizedSource = NormalizeUrl(htmlNode.GetAttributeValue("src", string.Empty));

        if (normalizedSource is null)
        {
            return;
        }

        stringBuilder.Append("<img");
        AppendAttribute(stringBuilder, "src", normalizedSource);
        AppendOptionalAttribute(stringBuilder, "alt", htmlNode.GetAttributeValue("alt", string.Empty));
        AppendOptionalAttribute(stringBuilder, "title", htmlNode.GetAttributeValue("title", string.Empty));
        AppendNumericAttribute(stringBuilder, "width", htmlNode.GetAttributeValue("width", string.Empty));
        AppendNumericAttribute(stringBuilder, "height", htmlNode.GetAttributeValue("height", string.Empty));
        stringBuilder.Append(" />");
    }

    private static void AppendAttribute(StringBuilder stringBuilder, string attributeName, string attributeValue)
    {
        stringBuilder.Append(' ');
        stringBuilder.Append(attributeName);
        stringBuilder.Append("=\"");
        stringBuilder.Append(WebUtility.HtmlEncode(attributeValue));
        stringBuilder.Append('"');
    }

    private static void AppendNumericAttribute(
        StringBuilder stringBuilder,
        string attributeName,
        string rawAttributeValue)
    {
        if (int.TryParse(rawAttributeValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var numericValue) &&
            numericValue > 0)
        {
            AppendAttribute(stringBuilder, attributeName, numericValue.ToString(CultureInfo.InvariantCulture));
        }
    }

    private static void AppendOptionalAttribute(
        StringBuilder stringBuilder,
        string attributeName,
        string rawAttributeValue)
    {
        if (string.IsNullOrWhiteSpace(rawAttributeValue))
        {
            return;
        }

        AppendAttribute(stringBuilder, attributeName, rawAttributeValue.Trim());
    }

    private static string BuildPlainTextHtml(string rawContent)
    {
        var normalizedText = rawContent
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace('\r', '\n');
        var paragraphSegments = normalizedText.Split("\n\n", StringSplitOptions.None);
        var stringBuilder = new StringBuilder();

        foreach (var paragraphSegment in paragraphSegments)
        {
            var encodedParagraph = WebUtility.HtmlEncode(paragraphSegment).Replace("\n", "<br />", StringComparison.Ordinal);

            if (string.IsNullOrWhiteSpace(encodedParagraph))
            {
                continue;
            }

            stringBuilder.Append("<p>");
            stringBuilder.Append(encodedParagraph);
            stringBuilder.Append("</p>");
        }

        return stringBuilder.ToString();
    }

    private static bool ContainsMeaningfulRichHtml(string sanitizedHtml)
    {
        if (string.IsNullOrWhiteSpace(sanitizedHtml))
        {
            return false;
        }

        var htmlDocument = new HtmlDocument();

        htmlDocument.LoadHtml($"<div>{sanitizedHtml}</div>");

        return htmlDocument.DocumentNode
            .Descendants()
            .Any((htmlNode) => htmlNode.NodeType == HtmlNodeType.Element &&
                htmlNode.Name.Equals("br", StringComparison.OrdinalIgnoreCase) == false);
    }

    private static string? NormalizeUrl(string rawUrl)
    {
        if (string.IsNullOrWhiteSpace(rawUrl))
        {
            return null;
        }

        var normalizedUrl = (HtmlEntity.DeEntitize(rawUrl) ?? string.Empty).Trim();

        if (normalizedUrl.StartsWith("//", StringComparison.Ordinal) ||
            normalizedUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase) ||
            normalizedUrl.StartsWith("javascript:", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        if (Uri.TryCreate(normalizedUrl, UriKind.Absolute, out var absoluteUri))
        {
            if (absoluteUri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase) ||
                absoluteUri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            {
                return absoluteUri.ToString();
            }

            return null;
        }

        if (Uri.TryCreate(new Uri("https://awaken.local/"), normalizedUrl, out var relativeUri) == false)
        {
            return null;
        }

        return $"{relativeUri.AbsolutePath}{relativeUri.Query}{relativeUri.Fragment}";
    }

    private static string SanitizeStyleAttributeValue(string rawStyleValue)
    {
        if (string.IsNullOrWhiteSpace(rawStyleValue))
        {
            return string.Empty;
        }

        var sanitizedStyleRules = rawStyleValue
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select((styleRule) =>
            {
                var styleRuleParts = styleRule.Split(':', 2, StringSplitOptions.TrimEntries);

                if (styleRuleParts.Length != 2)
                {
                    return null;
                }

                var propertyName = styleRuleParts[0].Trim();
                var propertyValue = styleRuleParts[1].Trim();

                if (AllowedStylePropertyNames.Contains(propertyName) == false ||
                    propertyValue.Length == 0 ||
                    propertyValue.Contains("url(", StringComparison.OrdinalIgnoreCase) ||
                    propertyValue.Contains("expression(", StringComparison.OrdinalIgnoreCase) ||
                    propertyValue.Contains("!important", StringComparison.OrdinalIgnoreCase))
                {
                    return null;
                }

                return $"{propertyName}: {propertyValue}";
            })
            .Where((styleRule) => string.IsNullOrWhiteSpace(styleRule) == false)
            .Cast<string>()
            .ToArray();

        return sanitizedStyleRules.Length == 0 ? string.Empty : string.Join("; ", sanitizedStyleRules);
    }
}
