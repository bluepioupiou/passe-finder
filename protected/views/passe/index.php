<?php
$this->breadcrumbs=array(
	'Passes',
);

$this->menu=array(
	array('label'=>'Create Passe', 'url'=>array('create')),
	array('label'=>'Manage Passe', 'url'=>array('admin')),
);
Yii::app()->clientScript->registerScript('search',
    "var ajaxUpdateTimeout;
    var ajaxRequest;
    $('input#search').keyup(function(){
        ajaxRequest = $(this).serialize();
        clearTimeout(ajaxUpdateTimeout);
        ajaxUpdateTimeout = setTimeout(function () {
            $.fn.yiiListView.update(
                'yw0',
                {data: ajaxRequest}
            )
        },
        500);
    });"
);
?>

	

<h2>Passes</h2>
<span class="alert i_info">Seules les passes validées et publiées sont affichées ici. Ainsi que celles créées par vos soins</span><br />
<b><label for="search">Recherche: </label></b>
<input type="text" id="search" name="search" />

<?php 
	$dataProvider->sort->defaultOrder='dateCreate DESC';
	$this->widget('zii.widgets.CListView', array(
	'dataProvider'=>$dataProvider,
	'template'=>"{sorter}{summary}{pager}\n{items}\n{pager}",	
	'sortableAttributes'=>array(
		'name'=>'Nom',
		'dateCreate'=>'creation'
	),
	'itemView'=>'_view',
)); ?>
