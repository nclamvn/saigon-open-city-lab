import json
import httpx
from .config import KARTAVIEW_PUBLIC_URL, KARTAVIEW_PUBLIC_GW_URL
from .models import PhotosResponse, ObjectSearchResponse


class KartaViewClient:
    def __init__(self, base_url: str = KARTAVIEW_PUBLIC_URL, base_gw_url: str = KARTAVIEW_PUBLIC_GW_URL, token: str = ""):
        self.base_url = base_url
        self.base_gw_url = base_gw_url
        self.client = httpx.Client(headers={
            "Authorization": token
        })

    def _handle_error_response(self, response: httpx.Response):
        """Handle error response and extract error message"""
        try:
            error_data = response.json()
            if "errors" in error_data and len(error_data["errors"]) > 0:
                error_message = error_data["errors"][0].get("message", "Unknown error")
                raise httpx.HTTPError(f"API Error: {error_message}")
        except ValueError:
            response.raise_for_status()

    def getNearbyPhotos(self, lat: float, lng: float, radius: int = 10, limit: int = 10) -> PhotosResponse:
        params = {
            "lat": lat,
            "lng": lng,
            "zoomLevel": 16,
            "join": "sequence",
            "orderBy": "id",
            "orderDirection": "desc",
            "radius": radius,
            "limit": limit
        }

        '''
        API: https://api.openstreetcam.org/2.0/photo/?lat=-6.193932715082624&lng=106.84937065233879&zoomLevel=15&join=sequence&orderBy=id&orderDirection=desc 
        '''
        try:
            url = f"{self.base_url}/2.0/photo/"
            response = self.client.get(url, params=params)
            self._handle_error_response(response)
            return PhotosResponse(**response.json())
        except Exception as e:
            return f"getNearbyPhotos exception: {e}"

    def generate_bbox_list(self, lat: float, lng: float, radius: int) -> list[str]:
        """
        Generate bounding box coordinates for a given center point and radius.
        
        Args:
            lat: Latitude in degrees
            lng: Longitude in degrees  
            radius: Radius in kilometers
            
        Returns:
            list[str]: List containing BBOX string for the area
        """
        import math

        # More accurate conversion accounting for latitude
        # 1 degree latitude ≈ 111 km everywhere
        # 1 degree longitude ≈ 111 km * cos(latitude) at given latitude
        
        km_per_degree_lat = 111.0
        km_per_degree_lng = 111.0 * math.cos(math.radians(lat))
        
        # Convert radius from km to degrees
        delta_lat = radius / km_per_degree_lat
        delta_lng = radius / km_per_degree_lng
        
        # Calculate bounding box coordinates
        min_lng = lng - delta_lng
        min_lat = lat - delta_lat
        max_lng = lng + delta_lng
        max_lat = lat + delta_lat
        
        # this bbox format BBOX+(103.55978395139272%2C+104.08061604861354%2C+1.5275300511029144%2C+1.175057161618696)
        return [f"BBOX({min_lng},{max_lng},{max_lat},{min_lat})"]

    def objectSearch(self, prompt: str, lat: float, lng: float, limit: int = 10, radius: int = 0, token: str = "") -> ObjectSearchResponse:
        params = {
            "prompt": prompt,
            "limit": limit,
            "point.lat": lat,
            "point.long": lng,
            "engine_mode": 1,
            "model_type": 1,
            "brief_response": True
        }

        if token == "":
            return ObjectSearchResponse(
                photos=[],
                error="KartaView token is required"
            )

        if radius > 0:
            params["bbox_list"] = self.generate_bbox_list(lat, lng, radius)

        '''
        API:curl --location --globoff 'https://karta-gateway.geo.azure.myteksi.net/view/service/kartaview_service/v1/photos:search?prompt=red+car&limit=500&point.lat=1.3513&point.long=103.8202&engine_mode=1&model_type=1&brief_response=true&bbox_list[]=BBOX+(103.55978395139272%2C+104.08061604861354%2C+1.5275300511029144%2C+1.175057161618696)' \
            --header 'x-karta-token: xxxxxxxxxx'
        '''

        try:
            url = f"{self.base_gw_url}/view/service/kartaview_service/v1/photos:search"
            headers = {
                "x-karta-token": token
            }
            response = self.client.get(url, params=params, headers=headers)
            self._handle_error_response(response)
            return ObjectSearchResponse(**response.json())
        except Exception as e:
            return f"objectSearch exception: {e}"