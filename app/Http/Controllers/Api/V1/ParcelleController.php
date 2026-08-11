<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreParcelleRequest;
use App\Http\Resources\Api\ParcelleResource;
use App\Models\Menage;
use App\Models\Parcelle;

class ParcelleController extends Controller
{
    public function index(Menage $menage)
    {
        return ParcelleResource::collection($menage->parcelles);
    }

    public function store(StoreParcelleRequest $request, Menage $menage)
    {
        $parcelle = $menage->parcelles()->create($request->validated());

        $menage->update(['date_derniere_activite' => now()]);

        return (new ParcelleResource($parcelle))->response()->setStatusCode(201);
    }

    public function show(Parcelle $parcelle)
    {
        return new ParcelleResource($parcelle);
    }

    public function update(StoreParcelleRequest $request, Parcelle $parcelle)
    {
        $parcelle->update($request->validated());
        $parcelle->menage()->update(['date_derniere_activite' => now()]);

        return new ParcelleResource($parcelle->fresh());
    }

    public function destroy(Parcelle $parcelle)
    {
        $parcelle->delete();

        return response()->json(null, 204);
    }
}
