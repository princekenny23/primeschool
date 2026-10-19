from rest_framework.filters import BaseFilterBackend


class QueryParamFilter(BaseFilterBackend):
    """Filters a queryset on any viewset-declared `filter_fields` found in the query string."""

    def filter_queryset(self, request, queryset, view):
        for field in getattr(view, "filter_fields", []):
            value = request.query_params.get(field)
            if value in (None, ""):
                continue
            if value in ("true", "false"):
                value = value == "true"
            queryset = queryset.filter(**{field: value})
        return queryset
