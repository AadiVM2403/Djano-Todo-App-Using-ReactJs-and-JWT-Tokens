from rest_framework import serializers
from todo.models import Todo, Profile

class TodoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Todo
        fields = ['id', 'title', 'complete']

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['profile_image']

