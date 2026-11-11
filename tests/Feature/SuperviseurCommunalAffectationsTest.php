<?php

namespace Tests\Feature;

use App\Models\Commune;
use App\Models\Province;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperviseurCommunalAffectationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_national_supervisor_can_assign_communes_from_different_provinces(): void
    {
        $superviseurNational = User::factory()->create([
            'role' => 'superviseur_national',
            'actif' => true,
        ]);
        $provinceA = Province::create(['code' => 'PA', 'nom' => 'Province A']);
        $provinceB = Province::create(['code' => 'PB', 'nom' => 'Province B']);
        $communeA = Commune::create(['province_id' => $provinceA->id, 'nom' => 'Commune A']);
        $communeB = Commune::create(['province_id' => $provinceB->id, 'nom' => 'Commune B']);

        $response = $this->actingAs($superviseurNational)->post(route('utilisateurs.store'), [
            'name' => 'Superviseur communal',
            'email' => 'communal@example.com',
            'role' => 'superviseur_communal',
            'communes_ids' => [$communeA->id, $communeB->id],
            'password' => 'password123',
        ]);

        $response->assertRedirect(route('utilisateurs.index'));
        $utilisateur = User::where('email', 'communal@example.com')->firstOrFail();
        $this->assertNull($utilisateur->province_id);
        $this->assertSame(
            [$communeA->id, $communeB->id],
            $utilisateur->communes()->orderBy('communes.id')->pluck('communes.id')->all(),
        );

        $superviseurProvincial = User::factory()->create([
            'role' => 'superviseur_provincial',
            'province_id' => $provinceA->id,
            'actif' => true,
        ]);
        $this->assertTrue(
            User::visiblePour($superviseurProvincial)->whereKey($utilisateur->id)->exists(),
        );
    }

    public function test_communes_from_the_same_province_keep_their_province_scope(): void
    {
        $superviseurNational = User::factory()->create([
            'role' => 'superviseur_national',
            'actif' => true,
        ]);
        $province = Province::create(['code' => 'PA', 'nom' => 'Province A']);
        $communeA = Commune::create(['province_id' => $province->id, 'nom' => 'Commune A']);
        $communeB = Commune::create(['province_id' => $province->id, 'nom' => 'Commune B']);

        $this->actingAs($superviseurNational)->post(route('utilisateurs.store'), [
            'name' => 'Superviseur communal',
            'email' => 'communal@example.com',
            'role' => 'superviseur_communal',
            'communes_ids' => [$communeA->id, $communeB->id],
            'password' => 'password123',
        ])->assertRedirect(route('utilisateurs.index'));

        $this->assertDatabaseHas('users', [
            'email' => 'communal@example.com',
            'province_id' => $province->id,
            'commune_id' => $communeA->id,
        ]);
    }

    public function test_provincial_supervisor_cannot_assign_a_commune_from_another_province(): void
    {
        $provinceA = Province::create(['code' => 'PA', 'nom' => 'Province A']);
        $provinceB = Province::create(['code' => 'PB', 'nom' => 'Province B']);
        $commune = Commune::create(['province_id' => $provinceB->id, 'nom' => 'Commune B']);
        $superviseurProvincial = User::factory()->create([
            'role' => 'superviseur_provincial',
            'province_id' => $provinceA->id,
            'actif' => true,
        ]);

        $response = $this->actingAs($superviseurProvincial)->post(route('utilisateurs.store'), [
            'name' => 'Superviseur communal',
            'email' => 'communal@example.com',
            'role' => 'superviseur_communal',
            'communes_ids' => [$commune->id],
            'password' => 'password123',
        ]);

        $response->assertSessionHasErrors('communes_ids');
        $this->assertDatabaseMissing('users', ['email' => 'communal@example.com']);
    }
}
