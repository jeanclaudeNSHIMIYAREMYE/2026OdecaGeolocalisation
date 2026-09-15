<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Authentifie un enquêteur/superviseur depuis l'app mobile et retourne
     * un token Bearer (Sanctum). Le token est nommé d'après l'appareil
     * (device_name) afin de pouvoir gérer/révoquer les sessions par appareil.
     */
    public function login(Request $request)
    {
        $donnees = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['required', 'string', 'max:255'],
        ]);

        $utilisateur = \App\Models\User::where('email', $donnees['email'])->first();

        if (! $utilisateur || ! Hash::check($donnees['password'], $utilisateur->password)) {
            throw ValidationException::withMessages([
                'email' => ["Identifiants incorrects."],
            ]);
        }

        if (! $utilisateur->actif) {
            throw ValidationException::withMessages([
                'email' => ["Ce compte a été désactivé."],
            ]);
        }

        // Un seul token actif par appareil : on révoque l'ancien du même nom.
        $utilisateur->tokens()->where('name', $donnees['device_name'])->delete();

        $token = $utilisateur->createToken($donnees['device_name']);

        return response()->json([
            'token' => $token->plainTextToken,
            'utilisateur' => [
                'id' => $utilisateur->id,
                'name' => $utilisateur->name,
                'email' => $utilisateur->email,
                'role' => $utilisateur->role,
                'province_id' => $utilisateur->province_id,
                'commune_id' => $utilisateur->commune_id,
            ],
        ]);
    }

    /**
     * Révoque uniquement le token utilisé pour cette requête
     * (ne déconnecte pas les autres appareils de l'utilisateur).
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }

    public function me(Request $request)
    {
        $utilisateur = $request->user()->load('collines');

        return response()->json([
            'utilisateur' => $utilisateur,
        ]);
    }
}
